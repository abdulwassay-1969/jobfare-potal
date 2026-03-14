
'use client';

import React from 'react';
import { Student } from '@/lib/types';
import { Github, Linkedin } from 'lucide-react';

interface CVViewProps {
  student: Student;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-4 gap-x-8">
    <div className="col-span-1">
      <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500">{title}</h2>
    </div>
    <div className="col-span-3">{children}</div>
  </div>
);

const SectionItem = ({ date, title, subtitle, location, children }: { date?: string; title: string; subtitle?: string; location?: string; children?: React.ReactNode }) => (
  <div className="mb-6">
     <div className="flex justify-between items-start mb-1">
      <div>
        {date && <p className="text-xs text-gray-500 font-medium mb-2">{date}</p>}
        <h3 className="font-bold text-lg leading-tight">{title}</h3>
        {subtitle && <p className="text-md font-medium">{subtitle}</p>}
      </div>
      {location && <p className="text-sm text-gray-600 font-medium">{location}</p>}
    </div>
    <div className="text-sm text-gray-700 space-y-1">{children}</div>
  </div>
);

export function CVView({ student }: CVViewProps) {
  return (
    <div className="bg-white text-black p-12 shadow-lg" style={{width: '210mm', minHeight: '297mm'}}>
        <header className="text-center border-b-2 border-gray-300 pb-6 mb-6">
            <h1 className="text-5xl font-bold">{student.fullName}</h1>
            {student.title && <p className="text-xl text-gray-600 mt-1">{student.title}</p>}
            <div className="flex justify-center items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-4 flex-wrap">
                {student.address && <span>{student.address}</span>}
                {student.phoneNumber && <span>{student.phoneNumber}</span>}
                {(student.personalEmail || student.email) && <span>{student.personalEmail || student.email}</span>}
                {student.githubUrl && (
                  <a href={student.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-900">
                    <Github className="h-4 w-4" />
                    <span>GitHub</span>
                  </a>
                )}
                {student.linkedinUrl && (
                  <a href={student.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-900">
                    <Linkedin className="h-4 w-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
            </div>
        </header>

        <main className="space-y-8">
            {student.summary && <Section title="Profile"><p className="text-sm text-gray-700">{student.summary}</p></Section>}
            
            {student.education && student.education.length > 0 && (
              <Section title="Education">
                {student.education.map((edu, index) => (
                  <SectionItem key={index} date={`${edu.startDate} - ${edu.endDate || 'Present'}`} title={edu.degree} subtitle={edu.institution}>
                    {edu.description && <p>{edu.description}</p>}
                  </SectionItem>
                ))}
              </Section>
            )}

            {student.experience && student.experience.length > 0 && (
              <Section title="Experience">
                 {student.experience.map((exp, index) => (
                  <SectionItem key={index} date={`${exp.startDate} - ${exp.endDate || 'Present'}`} title={exp.title} subtitle={exp.company}>
                    {exp.description && (
                      <ul className="list-disc list-inside space-y-1">
                        {exp.description.split('\n').map((line, i) => line.trim() && <li key={i}>{line.replace(/^-/, '').trim()}</li>)}
                      </ul>
                    )}
                  </SectionItem>
                ))}
              </Section>
            )}

            {student.skills && student.skills.length > 0 && (
                <Section title="Skills">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                       {student.skills.map((skill, index) => (
                           <div key={index} className="flex justify-between border-b border-gray-200 py-1">
                               <span className="font-medium">{skill.name}</span>
                               <span className="text-gray-600">{skill.level}</span>
                           </div>
                       ))}
                    </div>
                </Section>
            )}

            {student.languages && student.languages.length > 0 && (
                 <Section title="Languages">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {student.languages.map((lang, index) => (
                           <div key={index} className="flex justify-between border-b border-gray-200 py-1">
                               <span className="font-medium">{lang.language}</span>
                               <span className="text-gray-600">{lang.proficiency}</span>
                           </div>
                       ))}
                    </div>
                </Section>
            )}
            
            {student.hobbies && <Section title="Hobbies"><p className="text-sm text-gray-700">{student.hobbies}</p></Section>}

            <div className="grid grid-cols-4 gap-x-8 pt-4 border-t-2 border-gray-300">
                <div/>
                <div className="col-span-3 text-sm grid grid-cols-2 gap-x-8 gap-y-2">
                    {student.dateOfBirth && <div><p className="font-bold">Date / Place of birth</p><p>{student.dateOfBirth} / {student.placeOfBirth}</p></div>}
                    {student.maritalStatus && <div><p className="font-bold">Marital status</p><p>{student.maritalStatus}</p></div>}
                    {student.nationality && <div><p className="font-bold">Nationality / Gender</p><p>{student.nationality} / {student.gender}</p></div>}
                </div>
            </div>
        </main>
    </div>
  );
}
