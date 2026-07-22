'use client';

type Props = {
	profile: any;
	/** Contact / identity fields from the employee record */
	employee?: {
		email?: string | null;
		phone?: string | null;
		photoUrl?: string | null;
	};
	/** Admin remarks — hidden for peer OTP view */
	showRemarks?: boolean;
};

/**
 * Full read-only professional profile (resume-style sections).
 * Used by admin dossier overview and peer OTP view.
 */
export function ProfessionalProfileReadonly({ profile, employee, showRemarks = false }: Props) {
	const p = profile || {};
	const education = Array.isArray(p.education) ? p.education : [];
	const certs = Array.isArray(p.certifications) ? p.certifications : [];
	const exp = Array.isArray(p.experience) ? p.experience : [];
	const internships = Array.isArray(p.internships) ? p.internships : [];
	const projs = Array.isArray(p.projects) ? p.projects : [];
	const achievements = Array.isArray(p.achievements) ? p.achievements : [];
	const publications = Array.isArray(p.publications) ? p.publications : [];
	const customSections = Array.isArray(p.customSections) ? p.customSections : [];
	const skills = p.skills || {};
	const skillGroups: [string, string][] = [
		['programmingLanguages', 'Programming Languages'],
		['frontend', 'Frontend'],
		['backend', 'Backend'],
		['database', 'Database'],
		['cloud', 'Cloud'],
		['devops', 'DevOps'],
		['tools', 'Tools'],
		['softSkills', 'Soft Skills'],
	];
	const hasAnySkill = skillGroups.some(([k]) => Array.isArray(skills[k]) && skills[k].length > 0);
	const hasEc = p.emergencyContactName || p.emergencyContactPhone || p.emergencyContactRelation;
	const links: [string, string][] = [
		['LinkedIn', p.linkedinUrl],
		['GitHub', p.githubUrl],
		['Portfolio', p.portfolioUrl],
		['LeetCode', p.leetcodeUrl],
		['Codeforces', p.codeforcesUrl],
		['CodeChef', p.codechefUrl],
		['HackerRank', p.hackerrankUrl],
	];

	return (
		<>
			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Contact</h3>
				<div className="ev-info-grid">
					<div className="ev-info-item">
						<span>Email</span>
						<strong>{employee?.email || '—'}</strong>
					</div>
					<div className="ev-info-item">
						<span>Phone</span>
						<strong>{employee?.phone || '—'}</strong>
					</div>
				</div>
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Personal information</h3>
				<div className="ev-info-grid">
					<div className="ev-info-item">
						<span>Professional title</span>
						<strong>{p.professionalTitle || '—'}</strong>
					</div>
					<div className="ev-info-item">
						<span>Location</span>
						<strong>{[p.city, p.state, p.country].filter(Boolean).join(', ') || '—'}</strong>
					</div>
					{links.map(([label, url]) =>
						url ? (
							<div className="ev-info-item" key={label}>
								<span>{label}</span>
								<a href={url} target="_blank" rel="noreferrer">
									{String(url).replace(/^https?:\/\//, '')}
								</a>
							</div>
						) : null,
					)}
				</div>
				{links.every(([, url]) => !url) ? (
					<p className="ev-muted" style={{ marginTop: 10 }}>
						No links or coding profiles added yet.
					</p>
				) : null}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Professional summary</h3>
				<div className="ev-subsection">
					<p className="ev-muted" style={{ marginBottom: 4 }}>
						Resume summary
					</p>
					<p className="ev-prose">{p.about?.trim() ? p.about : 'No resume summary yet.'}</p>
				</div>
				<div className="ev-subsection">
					<p className="ev-muted" style={{ marginBottom: 4 }}>
						Career objective
					</p>
					<p className="ev-prose">{p.careerObjective?.trim() ? p.careerObjective : 'Not provided.'}</p>
				</div>
				<div className="ev-subsection ev-info-grid">
					<div className="ev-info-item">
						<span>Years of experience</span>
						<strong>{p.yearsOfExperience || '—'}</strong>
					</div>
					<div className="ev-info-item">
						<span>Industry</span>
						<strong>{p.industry || '—'}</strong>
					</div>
				</div>
				{showRemarks ? (
					<div className="ev-subsection">
						<p className="ev-muted" style={{ marginBottom: 4 }}>
							Remarks
						</p>
						<p className="ev-prose">{p.remarks?.trim() ? p.remarks : 'No remarks yet.'}</p>
					</div>
				) : null}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Emergency contact (EC)</h3>
				{hasEc ? (
					<ul className="ev-notes">
						<li>
							<strong>{p.emergencyContactName || '—'}</strong>
							{p.emergencyContactRelation ? ` · ${p.emergencyContactRelation}` : ''}
						</li>
						<li className="ev-mono">{p.emergencyContactPhone || '—'}</li>
					</ul>
				) : (
					<p className="ev-muted">Not provided.</p>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Education</h3>
				{education.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{education.map((q: any) => (
							<li key={q.id || q.degree}>
								<strong>{q.degree}</strong>
								{q.institution ? ` — ${q.institution}` : ''}
								{q.specialization ? ` (${q.specialization})` : ''}
								{q.from || q.to ? (
									<span className="ev-muted">
										{' '}
										· {q.from || '?'} – {q.to || '?'}
									</span>
								) : null}
								{q.cgpa ? <span className="ev-muted"> · CGPA {q.cgpa}</span> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Skills</h3>
				{!hasAnySkill ? (
					<p className="ev-muted">None listed.</p>
				) : (
					skillGroups.map(([key, label]) => {
						const tags = Array.isArray(skills[key]) ? skills[key] : [];
						if (!tags.length) return null;
						return (
							<div className="ev-skill-group" key={key}>
								<span>{label}</span>
								<div className="ev-tag-row">
									{tags.map((t: string) => (
										<span className="ev-tag" key={t}>
											{t}
										</span>
									))}
								</div>
							</div>
						);
					})
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Work experience</h3>
				{exp.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{exp.map((x: any) => (
							<li key={x.id || `${x.title}-${x.company}`}>
								<strong>{x.title}</strong>
								{x.company ? ` @ ${x.company}` : ''}
								{x.employmentType ? <span className="ev-muted"> · {x.employmentType}</span> : null}
								<span className="ev-muted">
									{' '}
									· {x.from || '?'} – {x.current ? 'Present' : x.to || '?'}
									{x.location ? ` · ${x.location}` : ''}
								</span>
								{x.description ? <div className="ev-muted">{x.description}</div> : null}
								{x.technologiesUsed ? <div className="ev-muted">Tech: {x.technologiesUsed}</div> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Internships</h3>
				{internships.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{internships.map((x: any) => (
							<li key={x.id || `${x.title}-${x.company}`}>
								<strong>{x.title}</strong>
								{x.company ? ` @ ${x.company}` : ''}
								<span className="ev-muted">
									{' '}
									· {x.from || '?'} – {x.current ? 'Present' : x.to || '?'}
									{x.location ? ` · ${x.location}` : ''}
								</span>
								{x.description ? <div className="ev-muted">{x.description}</div> : null}
								{x.technologiesUsed ? <div className="ev-muted">Tech: {x.technologiesUsed}</div> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Projects</h3>
				{projs.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{projs.map((pr: any) => (
							<li key={pr.id || pr.name}>
								<strong>{pr.name}</strong>
								{pr.role ? ` · ${pr.role}` : ''}
								{pr.tech ? <span className="ev-muted"> · {pr.tech}</span> : null}
								{pr.githubUrl ? (
									<>
										{' · '}
										<a href={pr.githubUrl} target="_blank" rel="noreferrer">
											GitHub
										</a>
									</>
								) : null}
								{pr.liveUrl ? (
									<>
										{' · '}
										<a href={pr.liveUrl} target="_blank" rel="noreferrer">
											Live demo
										</a>
									</>
								) : null}
								{pr.description ? <div className="ev-muted">{pr.description}</div> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Certifications</h3>
				{certs.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{certs.map((c: any) => (
							<li key={c.id || c.name}>
								<strong>{c.name}</strong>
								{c.issuer ? ` — ${c.issuer}` : ''}
								{c.issueDate ? ` (${c.issueDate})` : ''}
								{c.credentialId ? <span className="ev-muted"> · ID: {c.credentialId}</span> : null}
								{c.credentialUrl ? (
									<>
										{' · '}
										<a href={c.credentialUrl} target="_blank" rel="noreferrer">
											Credential
										</a>
									</>
								) : null}
								{c.fileUrl ? (
									<>
										{' · '}
										<a href={c.fileUrl} target="_blank" rel="noreferrer">
											View file
										</a>
									</>
								) : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Achievements &amp; awards</h3>
				{achievements.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{achievements.map((a: any) => (
							<li key={a.id || a.title}>
								<strong>{a.title}</strong>
								{a.organization ? ` — ${a.organization}` : ''}
								{a.date ? ` (${a.date})` : ''}
								{a.fileUrl ? (
									<>
										{' · '}
										<a href={a.fileUrl} target="_blank" rel="noreferrer">
											View file
										</a>
									</>
								) : null}
								{a.description ? <div className="ev-muted">{a.description}</div> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="ev-card" style={{ marginBottom: 12 }}>
				<h3>Publications &amp; research</h3>
				{publications.length === 0 ? (
					<p className="ev-muted">None listed.</p>
				) : (
					<ul className="ev-notes">
						{publications.map((pub: any) => (
							<li key={pub.id || pub.title}>
								<strong>{pub.title}</strong>
								{pub.authors ? <span className="ev-muted"> · {pub.authors}</span> : null}
								{pub.journal || pub.conference ? (
									<span className="ev-muted"> · {pub.journal || pub.conference}</span>
								) : null}
								{pub.year ? <span className="ev-muted"> ({pub.year})</span> : null}
								{pub.url ? (
									<>
										{' · '}
										<a href={pub.url} target="_blank" rel="noreferrer">
											Link
										</a>
									</>
								) : null}
								{pub.abstract ? <div className="ev-muted">{pub.abstract}</div> : null}
							</li>
						))}
					</ul>
				)}
			</div>

			{customSections.length > 0 ? (
				<div className="ev-card" style={{ marginBottom: 12 }}>
					<h3>Custom sections</h3>
					{customSections.map((c: any) => (
						<div key={c.id || c.title} className="ev-subsection">
							<p className="ev-muted" style={{ marginBottom: 4 }}>
								{c.title || 'Untitled'}
							</p>
							<p className="ev-prose" style={{ whiteSpace: 'pre-wrap' }}>
								{c.content || '—'}
							</p>
						</div>
					))}
				</div>
			) : null}
		</>
	);
}
