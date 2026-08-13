import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Resend } from 'resend';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

const resend = new Resend(RESEND_API_KEY);

// Helper to format email body message to clean HTML, supporting markdown / HTML tags
export function formatBodyToHtml(bodyText: string): string {
	if (!bodyText) return '';

	// Escape standard HTML tags to prevent raw injection, except simple allowed styling tags
	let html = bodyText
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Restore safe tags (b, i, u, strong, em, a)
	html = html
		.replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
		.replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/gi, '<em>$1</em>')
		.replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<span style="text-decoration: underline;">$1</span>')
		.replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
		.replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/gi, '<em>$1</em>')
		.replace(/&lt;a\s+href=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>')
		.replace(/&lt;a\s+href=\'([^\']+?)\'&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>');

	// Parse markdown bold: **text** or __text__
	html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');

	// Parse markdown italic: *text* or _text_
	html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');

	// Parse markdown underline: _text_ (when not using markdown italic, fallback check)
	// We check for _text_ specifically if it has underline context, or support custom <u>
	html = html.replace(/_([\s\S]*?)_/g, '<span style="text-decoration: underline;">$1</span>');

	// Parse markdown links: [Link Text](URL)
	html = html.replace(/\[([\s\S]*?)\]\((https?:\/\/[^\s\)]+?)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$1</a>');

	// Split distinct blocks by double newlines into paragraphs
	const paragraphs = html.split(/\n\s*\n+/);
	return paragraphs
		.map(p => {
			const trimmed = p.trim();
			if (!trimmed) return '';
			// Replace single newlines within a paragraph with line breaks
			const withLineBreaks = trimmed.replace(/\n/g, '<br />');
			return `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${withLineBreaks}</p>`;
		})
		.filter(Boolean)
		.join('');
}

// Wrap the HTML content inside the uniform brand template
export function getEmailTemplateHtml(subject: string, formattedBodyHtml: string): string {
	return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #334155; margin: 0 auto; background: #ffffff;">
	<div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
		<!--[if !mso]><!-->
		<style>
			@media (prefers-color-scheme: dark) {
				.wrkspace-light-logo { display: none !important; }
				.wrkspace-dark-logo { display: inline-block !important; }
			}
		</style>
		<!--<![endif]-->
		<img class="wrkspace-light-logo" src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: inline-block;" />
		<!--[if !mso]><!-->
		<img class="wrkspace-dark-logo" src="https://ik.imagekit.io/dypkhqxip/codered" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: none;" />
		<!--<![endif]-->
	</div>
	<h2 style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 16px;">${subject}</h2>
	<div style="font-size: 14px; line-height: 1.6; color: #334155;">
		${formattedBodyHtml}
	</div>
	<div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
		© 2026 Redlix Studio. All rights reserved.
	</div>
</div>
	`.trim();
}

// Singletons definition to avoid duplicate instances during Next.js hot-reloads
const globalForQueue = global as unknown as {
	redisConnection?: IORedis;
	emailQueue?: Queue;
	emailWorker?: Worker;
};

let redisConnection: IORedis | null = null;
let emailQueue: Queue | null = null;
let emailWorker: Worker | null = null;
let isRedisAvailable = false;

try {
	if (globalForQueue.redisConnection) {
		redisConnection = globalForQueue.redisConnection;
		isRedisAvailable = true;
	} else {
		redisConnection = new IORedis(REDIS_URL, {
			maxRetriesPerRequest: null,
			lazyConnect: true, // Don't block loading if offline
		});
		globalForQueue.redisConnection = redisConnection;
		isRedisAvailable = true;
	}
} catch (err) {
	console.warn('Redis connection failed to initialize. Falling back to direct mode.');
	redisConnection = null;
	isRedisAvailable = false;
}

if (isRedisAvailable && redisConnection) {
	try {
		emailQueue = globalForQueue.emailQueue || new Queue('emailQueue', {
			connection: redisConnection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 5000,
				},
			},
		});
		if (process.env.NODE_ENV !== 'production') {
			globalForQueue.emailQueue = emailQueue;
		}
	} catch (err) {
		console.warn('Failed to initialize BullMQ emailQueue:', err);
		emailQueue = null;
	}
}

// Process Email Job
export async function processEmailJob(to: string, subject: string, bodyText: string) {
	if (!RESEND_API_KEY) {
		console.warn('Missing RESEND_API_KEY. Simulating email dispatch to:', to);
		return { success: true, simulated: true };
	}

	const formattedBodyHtml = formatBodyToHtml(bodyText);
	const htmlTemplate = getEmailTemplateHtml(subject, formattedBodyHtml);

	const res = await resend.emails.send({
		from: 'WrkSpace Alerts <alerts@app.redlix.co.in>',
		to,
		subject,
		text: bodyText,
		html: htmlTemplate,
	});

	if (res.error) {
		throw new Error(`Resend API failed: ${res.error.message}`);
	}
	return { success: true, id: res.data?.id };
}

// Initialize Workers on Local/Long-Running Node process
if (isRedisAvailable && redisConnection && !globalForQueue.emailWorker) {
	try {
		emailWorker = new Worker('emailQueue', async (job: Job) => {
			const { to, subject, bodyText } = job.data;
			console.log(`Processing email job ${job.id} to: ${to}`);
			const result = await processEmailJob(to, subject, bodyText);
			
			// Introduce a 5-second time gap between email deliveries to prevent promotion classification
			console.log(`Waiting 5 seconds before next job...`);
			await new Promise(resolve => setTimeout(resolve, 5000));
			
			return result;
		}, {
			connection: redisConnection,
			concurrency: 1, // Process sequentially (one at a time)
		});

		emailWorker.on('completed', (job) => {
			console.log(`Job ${job.id} completed successfully!`);
		});

		emailWorker.on('failed', (job, err) => {
			console.error(`Job ${job?.id} failed with error:`, err);
		});

		globalForQueue.emailWorker = emailWorker;
	} catch (err) {
		console.warn('Failed to start BullMQ emailWorker:', err);
	}
}

// Queue producer helper with absolute fallback if Redis is offline
export async function addAlertJobsToQueue(recipients: string[], subject: string, bodyText: string) {
	if (emailQueue && isRedisAvailable) {
		try {
			for (const email of recipients) {
				await emailQueue.add('sendAlert', { to: email, subject, bodyText });
			}
			return { success: true, count: recipients.length, queued: true };
		} catch (err: any) {
			console.warn('BullMQ enqueue failed. Falling back to direct sequential dispatch:', err.message);
		}
	}

	// Fallback Mode: Direct background dispatching sequentially with 5-second delays
	setTimeout(async () => {
		console.log(`[Fallback Dispatch] Starting sequential dispatch for ${recipients.length} recipients...`);
		for (let i = 0; i < recipients.length; i++) {
			const email = recipients[i];
			try {
				console.log(`[Fallback Dispatch] Sending email (${i + 1}/${recipients.length}) to: ${email}`);
				await processEmailJob(email, subject, bodyText);
			} catch (err) {
				console.error(`[Fallback Dispatch] Failed to send email to: ${email}`, err);
			}
			
			if (i < recipients.length - 1) {
				// Wait 5 seconds before sending the next email
				await new Promise(resolve => setTimeout(resolve, 5000));
			}
		}
		console.log('[Fallback Dispatch] Sequential dispatch complete.');
	}, 10);

	return { success: true, count: recipients.length, queued: false, direct: true };
}
