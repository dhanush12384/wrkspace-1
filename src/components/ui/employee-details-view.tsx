import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { profileFromEmployee } from '@/lib/employee-professional-profile';
import { Trophy, Zap, Heart, Flame, Shield, Sparkles, CheckCircle as CheckCircleIcon, Award } from 'lucide-react';

const BadgeIcon = ({ name, className }: { name: string; className?: string }) => {
	switch (name) {
		case 'Trophy':
			return <Trophy className={className} />;
		case 'Zap':
			return <Zap className={className} />;
		case 'Heart':
			return <Heart className={className} />;
		case 'Flame':
			return <Flame className={className} />;
		case 'Shield':
			return <Shield className={className} />;
		case 'Sparkles':
			return <Sparkles className={className} />;
		case 'CheckCircle':
			return <CheckCircleIcon className={className} />;
		case 'Award':
		default:
			return <Award className={className} />;
	}
};

interface EmployeeDetailsViewProps {
	employee: any;
	viewingTab: 'personal' | 'verification' | 'attendance';
	setViewingTab: (tab: 'personal' | 'verification' | 'attendance') => void;
	onBack: () => void;
	attendanceList: any[];
}

export const EmployeeDetailsView: React.FC<EmployeeDetailsViewProps> = ({
	employee,
	viewingTab,
	setViewingTab,
	onBack,
	attendanceList
}) => {
	const emp = employee;
	const parsedProfile = profileFromEmployee(emp);

	// Calculate attendance statistics
	const empLogs = attendanceList.filter((log: any) => log.employeeId === emp.id);
	const presentCount = empLogs.filter((log: any) => log.status === 'Present' || log.status === 'Checked In').length;
	const absentCount = empLogs.filter((log: any) => log.status === 'Absent').length;
	const totalLogsCount = empLogs.length;
	const attendanceRate = totalLogsCount > 0 ? ((presentCount / totalLogsCount) * 100).toFixed(1) : '100.0';

	// Parse badges
	let badgesList: any[] = [];
	try {
		if (emp.badges) {
			badgesList = JSON.parse(emp.badges);
		}
	} catch (e) {}

	const initials = (first: string, last: string) => {
		return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* Breadcrumbs */}
			<div className="flex items-center gap-2 text-xs text-slate-500 font-medium font-sans">
				<button 
					onClick={onBack} 
					className="hover:text-[#E61E32] transition-colors cursor-pointer"
				>
					Employees
				</button>
				<span className="text-slate-300">/</span>
				<span className="text-slate-700 font-semibold">
					{emp.firstName} {emp.lastName}
				</span>
			</div>

			{/* Header Banner */}
			<div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
				<div className="flex items-center gap-4">
					<div className="size-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-[#E61E32] text-xl uppercase shrink-0">
						{initials(emp.firstName, emp.lastName)}
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-base font-bold text-slate-900 leading-tight">
								{emp.firstName} {emp.middleName ? `${emp.middleName} ` : ''}{emp.lastName}
							</h3>
							<span className={cn(
								"px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700",
								emp.employmentStatus !== 'Active' && "bg-amber-50 text-amber-700"
							)}>
								{emp.employmentStatus || 'Active'}
							</span>
						</div>
						<p className="text-xs text-rose-605 font-semibold mt-0.5">{emp.role || 'Employee'}</p>
						<div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
							<span>ID: {emp.id}</span>
							<span>•</span>
							<span>Wing: {emp.wingName || '—'}</span>
							<span>•</span>
							<span>Lead: {emp.wingLeadName || '—'}</span>
						</div>
					</div>
				</div>
				<button 
					onClick={onBack} 
					className="text-slate-650 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
				>
					Back to Directory
				</button>
			</div>

			{/* Navigation Pills (No borders) */}
			<div className="flex flex-wrap gap-2">
				{(['personal', 'verification', 'attendance'] as const).map((t) => (
					<button
						key={t}
						onClick={() => setViewingTab(t)}
						className={cn(
							"px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
							viewingTab === t 
								? "bg-[#E61E32] text-white" 
								: "bg-slate-100 text-slate-650 hover:bg-slate-200"
						)}
					>
						{t === 'personal' && 'Personal & Contact Details'}
						{t === 'verification' && 'Verification & Dossier'}
						{t === 'attendance' && 'Attendance Logs & Stats'}
					</button>
				))}
			</div>

			{/* Content Cards */}
			<div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6">
				{viewingTab === 'personal' && (
					<div className="space-y-6">
						<div>
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Basic Personal Information
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">First Name</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.firstName || ''} />
								</div>
								{emp.middleName && (
									<div className="space-y-1">
										<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Middle Name</label>
										<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.middleName || ''} />
									</div>
								)}
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Last Name</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.lastName || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Email Address</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.email || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Phone Number</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.phone || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Gender</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.gender || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Wing Name</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.wingName || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Wing Lead</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.wingLeadName || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Role</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.role || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Joined Date</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={new Date(emp.createdAt).toLocaleDateString()} />
								</div>
							</div>
						</div>

						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Home Location Setup
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Home Address</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.homeAddress || 'No home address recorded'} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Plus Code</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.homePlusCode || 'No coordinates linked'} />
								</div>
							</div>
						</div>

						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Emergency Contact details
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Name</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.emergencyContactName || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Phone</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.emergencyContactPhone || ''} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Relation</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.emergencyContactRelation || ''} />
								</div>
							</div>
						</div>
					</div>
				)}

				{viewingTab === 'verification' && (
					<div className="space-y-6">
						<div>
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Employment & Verification Info
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Employment Status</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none font-semibold text-emerald-700" value={emp.employmentStatus || 'Active'} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Former Company Worked For</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.companyWorkedFor || 'None'} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Conduct Review</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none" value={emp.conduct || '—'} />
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Overall Score</label>
									<Input readOnly className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 outline-none font-bold" value={emp.overallScore || '—'} />
								</div>
							</div>
						</div>

						{/* Badges Grid (no borders) */}
						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Assigned Badges
							</h4>
							{badgesList.length === 0 ? (
								<p className="text-xs text-slate-400 italic">No badges assigned yet.</p>
							) : (
								<div className="flex flex-wrap gap-2">
									{badgesList.map((badge: any) => (
										<div key={badge.id} className={cn(
											"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-0",
											badge.color === 'blue' && "bg-blue-50 text-blue-700",
											badge.color === 'green' && "bg-emerald-50 text-emerald-700",
											badge.color === 'purple' && "bg-purple-50 text-purple-700",
											badge.color === 'orange' && "bg-amber-50 text-amber-700",
											badge.color === 'red' && "bg-rose-50 text-rose-700",
											badge.color === 'yellow' && "bg-yellow-50 text-yellow-800",
											!badge.color && "bg-slate-100 text-slate-700"
										)}>
											<BadgeIcon name={badge.icon} className="size-3.5" />
											<span>{badge.title}</span>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Remarks */}
						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Official Remarks
							</h4>
							<div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 text-xs italic text-slate-700 leading-relaxed">
								"{emp.remarks || 'No official remarks recorded.'}"
							</div>
						</div>

						{/* Verification Dossier Attachments */}
						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Verification Dossier Attachments
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
								{emp.personalFileUrl ? (
									<a href={emp.personalFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
										<span className="font-semibold text-slate-700 truncate">Personal Dossier (PDF/Image)</span>
										<span className="text-[#E61E32] font-bold shrink-0">View ↗</span>
									</a>
								) : (
									<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
										No Personal File attached
									</div>
								)}
								{emp.summaryFileUrl ? (
									<a href={emp.summaryFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
										<span className="font-semibold text-slate-700 truncate">Summary / Resume File</span>
										<span className="text-[#E61E32] font-bold shrink-0">View ↗</span>
									</a>
								) : (
									<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
										No Resume File attached
									</div>
								)}
								{emp.skillsFileUrl ? (
									<a href={emp.skillsFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
										<span className="font-semibold text-slate-700 truncate">Skills & Certifications Dossier</span>
										<span className="text-[#E61E32] font-bold shrink-0">View ↗</span>
									</a>
								) : (
									<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
										No Skills File attached
									</div>
								)}
							</div>
							{emp.idCardUrl && (
								<div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
									<span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 self-start">ID Card Preview</span>
									<img src={emp.idCardUrl} alt="Employee ID card" className="max-h-48 object-contain border border-slate-200 rounded-xl shadow-xs" />
								</div>
							)}
						</div>

						{/* Tech Profiles */}
						<div className="border-t border-slate-100 pt-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Social & Tech Profiles
							</h4>
							<div className="flex flex-wrap gap-2.5">
								{emp.linkedinUrl && <a href={emp.linkedinUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-all">LinkedIn</a>}
								{emp.githubUrl && <a href={emp.githubUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all">GitHub</a>}
								{emp.portfolioUrl && <a href={emp.portfolioUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-all">Portfolio</a>}
								{emp.leetcodeUrl && <a href={emp.leetcodeUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-all">LeetCode</a>}
								{emp.codeforcesUrl && <a href={emp.codeforcesUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-all">Codeforces</a>}
								{emp.codechefUrl && <a href={emp.codechefUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-all">CodeChef</a>}
								{emp.hackerrankUrl && <a href={emp.hackerrankUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-xl transition-all">HackerRank</a>}
							</div>
						</div>

						{/* Academic & Professional Background */}
						<div className="border-t border-slate-100 pt-5 space-y-5">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4">
								Dossier Details
							</h4>
							
							<div className="space-y-4">
								{/* Objective */}
								{emp.careerObjective && (
									<div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-xs text-slate-650 leading-relaxed">
										<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Career Objective</span>
										{emp.careerObjective}
									</div>
								)}

								{/* Experience */}
								<div className="space-y-2">
									<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Experience Details</span>
									{parsedProfile.experience.length === 0 ? (
										<p className="text-xs text-slate-400 italic">No experience added.</p>
									) : (
										<div className="space-y-3">
											{parsedProfile.experience.map((exp) => (
												<div key={exp.id} className="border border-slate-200/50 p-4 rounded-xl bg-slate-50/50 text-xs">
													<div className="flex justify-between items-start gap-2 flex-wrap">
														<div>
															<h5 className="font-bold text-slate-900">{exp.title}</h5>
															<p className="text-slate-500 mt-0.5">{exp.company} {exp.location ? `• ${exp.location}` : ''}</p>
														</div>
														<span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] tracking-wide shrink-0">
															{exp.from} - {exp.current ? 'Present' : exp.to}
														</span>
													</div>
													{exp.description && <p className="text-slate-650 mt-2 whitespace-pre-line leading-relaxed">{exp.description}</p>}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Education */}
								<div className="space-y-2">
									<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Education Details</span>
									{parsedProfile.education.length === 0 ? (
										<p className="text-xs text-slate-400 italic">No education history added.</p>
									) : (
										<div className="space-y-3">
											{parsedProfile.education.map((edu) => (
												<div key={edu.id} className="border border-slate-200/50 p-4 rounded-xl bg-slate-50/50 text-xs">
													<div className="flex justify-between items-start gap-2 flex-wrap">
														<div>
															<h5 className="font-bold text-slate-900">{edu.degree} {edu.specialization ? `in ${edu.specialization}` : ''}</h5>
															<p className="text-slate-555 mt-0.5">{edu.institution}</p>
														</div>
														<span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] tracking-wide shrink-0">
															{edu.from} - {edu.to}
														</span>
													</div>
													{edu.cgpa && <p className="text-[11px] font-bold text-[#E61E32] mt-1.5">Grade: {edu.cgpa}</p>}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Projects */}
								<div className="space-y-2">
									<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projects Details</span>
									{parsedProfile.projects.length === 0 ? (
										<p className="text-xs text-slate-400 italic">No projects listed.</p>
									) : (
										<div className="space-y-3">
											{parsedProfile.projects.map((proj) => (
												<div key={proj.id} className="border border-slate-200/50 p-4 rounded-xl bg-slate-50/50 text-xs">
													<div className="flex justify-between items-start gap-2 flex-wrap">
														<div>
															<h5 className="font-bold text-slate-900">{proj.name}</h5>
															<p className="text-rose-600 font-semibold text-[10px] mt-0.5">Role: {proj.role}</p>
														</div>
														<div className="flex gap-2 shrink-0">
															{proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline text-[10px]">GitHub</a>}
															{proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="text-emerald-650 font-semibold hover:underline text-[10px]">Live URL</a>}
														</div>
													</div>
													{proj.description && <p className="text-slate-650 mt-2 leading-relaxed">{proj.description}</p>}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{viewingTab === 'attendance' && (
					<div className="space-y-6">
						{/* Statistics Grid */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							<div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
								<span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Logs</span>
								<span className="text-2xl font-black text-slate-900 mt-2">{totalLogsCount} Days</span>
							</div>
							<div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
								<span className="text-[10px] text-emerald-850 font-bold uppercase tracking-wider">Days Present</span>
								<span className="text-2xl font-black text-emerald-700 mt-2">{presentCount} Days</span>
							</div>
							<div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
								<span className="text-[10px] text-rose-850 font-bold uppercase tracking-wider">Days Absent</span>
								<span className="text-2xl font-black text-rose-700 mt-2">{absentCount} Days</span>
							</div>
							<div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
								<span className="text-[10px] text-blue-850 font-bold uppercase tracking-wider">Attendance Rate</span>
								<span className="text-2xl font-black text-blue-700 mt-2">{attendanceRate}%</span>
							</div>
						</div>

						{/* Attendance logs list */}
						<div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs space-y-4">
							<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
								Attendance History Logs ({empLogs.length})
							</h4>
							
							{empLogs.length === 0 ? (
								<p className="text-xs text-slate-400 italic text-center py-6">No attendance logs found for this employee.</p>
							) : (
								<div className="overflow-x-auto max-h-[40vh] scrollbar-thin">
									<table className="w-full text-xs text-left border-collapse">
										<thead>
											<tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
												<th className="py-2.5 px-3">Date</th>
												<th className="py-2.5 px-3">Check-In</th>
												<th className="py-2.5 px-3">Check-Out</th>
												<th className="py-2.5 px-3">Status</th>
											</tr>
										</thead>
										<tbody>
											{empLogs.map((log: any) => (
												<tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-slate-700">
													<td className="py-2.5 px-3 font-semibold text-slate-900">{log.date}</td>
													<td className="py-2.5 px-3">
														<span className={cn(
															"px-1.5 py-0.5 rounded text-[10px] font-mono",
															log.checkIn === 'Absent' ? "text-rose-700 bg-rose-50" : "text-slate-800 bg-slate-100"
														)}>
															{log.checkIn}
														</span>
													</td>
													<td className="py-2.5 px-3">
														{log.checkOut ? (
															<span className={cn(
																"px-1.5 py-0.5 rounded text-[10px] font-mono",
																log.checkOut === 'Absent' ? "text-rose-700 bg-rose-50" : "text-slate-800 bg-slate-100"
															)}>
																{log.checkOut}
															</span>
														) : (
															<span className="text-slate-400 font-light">—</span>
														)}
													</td>
													<td className="py-2.5 px-3">
														<span className={cn(
															"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
															(log.status === 'Checked In' || log.status === 'Present') 
																? "bg-emerald-50 text-emerald-700" 
																: "bg-rose-50 text-rose-700"
														)}>
															{log.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
