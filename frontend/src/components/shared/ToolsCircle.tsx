'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const tools = [
  { 
    name: 'Gmail', 
    slug: 'gmail',
    logo: (
      <svg viewBox="0 0 256 193" className="w-full h-full">
        <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z"/>
        <path fill="#34A853" d="M197.818 192.05h40.727c9.658 0 17.455-7.826 17.455-17.455V49.505l-27.507 15.572-30.675 28.063v98.91Z"/>
        <path fill="#EA4335" d="M197.818 17.455v75.683L256 49.504V26.181c0-21.69-24.64-34.118-41.89-21.69l-16.292 13.964Z"/>
        <path fill="#FBBC04" d="M0 49.504l58.182 43.634V17.455L41.89 4.492C24.61-7.937 0 4.492 0 26.18v23.324Z"/>
        <path fill="#C5221F" d="M58.182 93.138L128 144.772l69.818-51.634V17.455H58.182v75.683Z"/>
      </svg>
    ), 
    color: '#EA4335' 
  },
  { 
    name: 'Outlook', 
    slug: 'outlook',
    logo: (
      <svg viewBox="0 0 256 256" className="w-full h-full">
        <path fill="#0078D4" d="M119.26 66.94h93.31a8.84 8.84 0 0 1 8.84 8.84v104.38a8.84 8.84 0 0 1-8.84 8.84h-93.31a8.84 8.84 0 0 1-8.84-8.84V75.78a8.84 8.84 0 0 1 8.84-8.84Z"/>
        <path fill="#0078D4" d="M119.26 66.94h-27.75a8.84 8.84 0 0 0-8.84 8.84v104.38a8.84 8.84 0 0 0 8.84 8.84h27.75a8.84 8.84 0 0 0 8.84-8.84V75.78a8.84 8.84 0 0 0-8.84-8.84Z"/>
        <circle fill="#fff" cx="73.8" cy="128" r="35.31"/>
        <path fill="#0078D4" d="M73.8 105.69c-12.33 0-22.31 10-22.31 22.31s10 22.31 22.31 22.31S96.11 140.33 96.11 128s-10-22.31-22.31-22.31Zm0 35.31c-7.15 0-13-5.85-13-13s5.85-13 13-13 13 5.85 13 13-5.85 13-13 13Z"/>
        <path fill="#fff" d="M212.57 75.78v7.38l-79.15 55.07a8.84 8.84 0 0 1-10.42 0L43.45 83.16v-7.38a8.84 8.84 0 0 1 8.84-8.84h151.44a8.84 8.84 0 0 1 8.84 8.84Z"/>
        <path fill="#fff" d="M137 145.61a8.84 8.84 0 0 0 10.42 0l65.15-45.38v79.93a8.84 8.84 0 0 1-8.84 8.84H52.29a8.84 8.84 0 0 1-8.84-8.84v-79.93Z"/>
      </svg>
    ), 
    color: '#0078D4' 
  },
  { 
    name: 'Slack', 
    slug: 'slack',
    logo: (
      <svg viewBox="0 0 256 256" className="w-full h-full">
        <path fill="#E01E5A" d="M105.42 105.419c0-14.697-11.718-26.616-26.6-26.616-14.698 0-26.6 11.919-26.6 26.616 0 14.697 11.902 26.6 26.6 26.6h26.6v-26.6Z"/>
        <path fill="#36C5F0" d="M132.017 105.419c0-14.697 11.919-26.616 26.6-26.616 14.698 0 26.6 11.919 26.6 26.616v66.484c0 14.698-11.902 26.6-26.6 26.6-14.681 0-26.6-11.902-26.6-26.6v-66.484Z"/>
        <path fill="#2EB67D" d="M158.617 52.219c14.698 0 26.6-11.919 26.6-26.6C185.217 11.902 173.315.001 158.617.001c-14.681 0-26.6 11.901-26.6 26.618v26.6h26.6Z"/>
        <path fill="#ECB22E" d="M158.617 78.819c14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6H92.133c-14.698 0-26.6-11.902-26.6-26.6 0-14.681 11.902-26.6 26.6-26.6h66.484Z"/>
        <path fill="#E01E5A" d="M211.801 105.419c0 14.697-11.919 26.6-26.6 26.6-14.698 0-26.6-11.903-26.6-26.6s11.902-26.616 26.6-26.616c14.681 0 26.6 11.919 26.6 26.616Z"/>
        <path fill="#36C5F0" d="M185.201 78.819c0 14.697-11.902 26.6-26.6 26.6-14.681 0-26.6-11.903-26.6-26.6V12.335c0-14.698 11.919-26.6 26.6-26.6 14.698.001 26.6 11.902 26.6 26.6v66.484Z"/>
        <path fill="#2EB67D" d="M132.017 185.201c0-14.681 11.919-26.6 26.6-26.6 14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6h-26.6v-26.6Z"/>
        <path fill="#ECB22E" d="M105.42 211.801c0-14.681 11.902-26.6 26.6-26.6h66.484c14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6H132.02c-14.698-.001-26.6-11.902-26.6-26.6Z"/>
      </svg>
    ), 
    color: '#4A154B' 
  },
  { 
    name: 'Zoom', 
    slug: 'zoom',
    logo: (
      <svg viewBox="0 0 256 256" className="w-full h-full">
        <rect width="256" height="256" rx="60" fill="#2D8CFF"/>
        <path fill="#fff" d="M149.28 128c8.326 0 15.073-6.747 15.073-15.073S157.606 97.854 149.28 97.854s-15.073 6.747-15.073 15.073S140.954 128 149.28 128ZM106.72 128c8.326 0 15.073-6.747 15.073-15.073S115.046 97.854 106.72 97.854s-15.073 6.747-15.073 15.073S98.394 128 106.72 128ZM192.84 112.927c0 8.326-6.747 15.073-15.073 15.073s-15.073-6.747-15.073-15.073 6.747-15.073 15.073-15.073 15.073 6.747 15.073 15.073ZM78.233 112.927c0 8.326-6.747 15.073-15.073 15.073S48.087 121.253 48.087 112.927s6.747-15.073 15.073-15.073 15.073 6.747 15.073 15.073ZM128 170.56c8.326 0 15.073-6.747 15.073-15.073s-6.747-15.073-15.073-15.073-15.073 6.747-15.073 15.073S119.674 170.56 128 170.56ZM128 100.414c8.326 0 15.073-6.747 15.073-15.073S136.326 70.268 128 70.268s-15.073 6.747-15.073 15.073S119.674 100.414 128 100.414Z"/>
      </svg>
    ), 
    color: '#2D8CFF' 
  },
  { 
    name: 'Teams', 
    slug: 'teams',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#6264A7" d="M19.4 8.2a3.6 3.6 0 1 0-7.2 0 3.6 3.6 0 0 0 7.2 0zm-1.8 0a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z"/>
        <path fill="#6264A7" d="M11.8 4.6a3.6 3.6 0 1 0-7.2 0 3.6 3.6 0 0 0 7.2 0zm-1.8 0a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z"/>
        <path fill="#6264A7" d="M8.2 24C6.43 24 5 22.57 5 20.8v-4.5c0-1.77 1.43-3.2 3.2-3.2h3.6c1.77 0 3.2 1.43 3.2 3.2v4.5c0 1.77-1.43 3.2-3.2 3.2H8.2z"/>
        <path fill="#6264A7" d="M20.8 24c-1.77 0-3.2-1.43-3.2-3.2v-4.5c0-1.77 1.43-3.2 3.2-3.2H24v7.7c0 1.77-1.43 3.2-3.2 3.2z"/>
      </svg>
    ), 
    color: '#6264A7' 
  },
  { 
    name: 'Google Drive', 
    slug: 'google-drive',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#0F9D58" d="m8 16 4 7H5.5a2 2 0 0 1-1.7-3l2.2-4z"/>
        <path fill="#F4B400" d="M20.5 18H8l-2.2-4h14.7z"/>
        <path fill="#4285F4" d="m8 16 4-7 4 7z"/>
        <path fill="#0F9D58" d="M12 9L5.5 18 8 22z"/>
        <path fill="#F4B400" d="M12 9 18.5 18 16 22z"/>
        <path fill="#EA4335" d="m12 9-4 7-4-7z"/>
      </svg>
    ), 
    color: '#4285F4' 
  },
  { 
    name: 'Dropbox', 
    slug: 'dropbox',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#0061FF" d="M6 2L12 6 6 10 0 6z"/>
        <path fill="#0061FF" d="M18 2L24 6 18 10 12 6z"/>
        <path fill="#0061FF" d="M6 14L12 18 6 22 0 18z"/>
        <path fill="#0061FF" d="M18 14L24 18 18 22 12 18z"/>
        <path fill="#0061FF" d="M6 10L12 14 18 10 12 6z"/>
      </svg>
    ), 
    color: '#0061FF' 
  },
  { 
    name: 'Notion', 
    slug: 'notion',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#000000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.746c.093.42 0 .84-.42.887l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.61c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.14z"/>
      </svg>
    ), 
    color: '#000000' 
  },
  { 
    name: 'Trello', 
    slug: 'trello',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#0079BF" d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
      </svg>
    ), 
    color: '#0079BF' 
  },
  { 
    name: 'Asana', 
    slug: 'asana',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle fill="#F06A6A" cx="12" cy="4.5" r="4.5"/>
        <circle fill="#F06A6A" cx="5.5" cy="15" r="4.5"/>
        <circle fill="#F06A6A" cx="18.5" cy="15" r="4.5"/>
      </svg>
    ), 
    color: '#F06A6A' 
  },
  { 
    name: 'Jira', 
    slug: 'jira',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#2684FF" d="M11.571 11.513H0a11.571 11.571 0 0 0 11.571 11.57V11.513z"/>
        <path fill="#2684FF" d="M24 11.513H12.429v11.57A11.571 11.571 0 0 0 24 11.513z"/>
        <linearGradient id="jira-a" x1="11.571" x2="0" y1="11.513" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0052cc"/>
          <stop offset="1" stopColor="#2684ff"/>
        </linearGradient>
        <path fill="url(#jira-a)" d="M11.571 0H0v11.513h11.571z"/>
        <linearGradient id="jira-b" x1="24" x2="12.429" y1="11.513" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0052cc"/>
          <stop offset="1" stopColor="#2684ff"/>
        </linearGradient>
        <path fill="url(#jira-b)" d="M24 0H12.429v11.513H24z"/>
      </svg>
    ), 
    color: '#0052CC' 
  },
  { 
    name: 'Figma', 
    slug: 'figma',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#F24E1E" d="M8.5 24a4.5 4.5 0 0 1-4.5-4.5v-4.5h4.5a4.5 4.5 0 0 1 0 9z"/>
        <path fill="#FF7262" d="M4 10.5A4.5 4.5 0 0 1 8.5 6H13v9H8.5A4.5 4.5 0 0 1 4 10.5z"/>
        <path fill="#A259FF" d="M4 5.5A4.5 4.5 0 0 1 8.5 1H13v9H8.5A4.5 4.5 0 0 1 4 5.5z"/>
        <path fill="#1ABCFE" d="M13 1h4.5a4.5 4.5 0 0 1 0 9H13z"/>
        <circle fill="#0ACF83" cx="17.5" cy="15" r="4.5"/>
      </svg>
    ), 
    color: '#F24E1E' 
  },
  { 
    name: 'GitHub', 
    slug: 'github',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#181717" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ), 
    color: '#181717' 
  },
  { 
    name: 'Linear', 
    slug: 'linear',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#5E6AD2" d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm-3.45-16.83L12 10.62l3.45-3.45a.75.75 0 0 1 1.06 1.06L13.06 11.68l3.45 3.45a.75.75 0 0 1-1.06 1.06L12 12.74l-3.45 3.45a.75.75 0 0 1-1.06-1.06l3.45-3.45-3.45-3.45a.75.75 0 0 1 1.06-1.06z"/>
      </svg>
    ), 
    color: '#5E6AD2' 
  },
  { 
    name: 'HubSpot', 
    slug: 'hubspot',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#FF7A59" d="M18.164 7.93V5.084a1.917 1.917 0 1 0-3.834 0v2.846a6.012 6.012 0 1 0 3.834 0zm-1.917 8.07a2.167 2.167 0 1 1 0-4.333 2.167 2.167 0 0 1 0 4.333z"/>
      </svg>
    ), 
    color: '#FF7A59' 
  },
  { 
    name: 'Salesforce', 
    slug: 'salesforce',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#00A1E0" d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zM8.4 16.8a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm3.6-8.4a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM12 21.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm0-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm3.6 4.8a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z"/>
      </svg>
    ), 
    color: '#00A1E0' 
  },
  { 
    name: 'Monday.com', 
    slug: 'monday',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#FF3D57" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.5 18a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
      </svg>
    ), 
    color: '#FF3D57' 
  },
  { 
    name: 'Discord', 
    slug: 'discord',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ), 
    color: '#5865F2' 
  },
  { 
    name: 'Calendly', 
    slug: 'calendly',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#006BFF" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2C7.582 4 4 7.582 4 12s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 2c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z"/>
      </svg>
    ), 
    color: '#006BFF' 
  },
  { 
    name: 'WhatsApp', 
    slug: 'whatsapp',
    logo: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488"/>
      </svg>
    ), 
    color: '#25D366' 
  },
]

export function ToolsCircle() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const router = useRouter()

  const handleToolClick = (slug: string) => {
    router.push(`/integrations/${slug}`)
  }

  return (
    <div className="relative w-full h-full min-h-[280px] sm:min-h-[350px] lg:min-h-[400px] flex items-center justify-center">
      {/* Rotating dashed border circle */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border-2 border-dashed border-gray-200/50"
      />
      
      {/* Tools container - grid layout inside circle */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Circular mask to contain the grid */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden">
          {/* Grid container positioned inside the circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-5 gap-1 sm:gap-2 p-4 sm:p-5 lg:p-6">
              {tools.map((tool, i) => {
                // Fish-eye effect calculation
                let scale = 1
                let zIndex = 1
                let opacity = 1
                
                if (hoveredIndex !== null) {
                  // Calculate distance for grid-based fish-eye effect
                  const row1 = Math.floor(i / 5)
                  const col1 = i % 5
                  const row2 = Math.floor(hoveredIndex / 5)
                  const col2 = hoveredIndex % 5
                  const distance = Math.abs(row1 - row2) + Math.abs(col1 - col2) // Manhattan distance
                  
                  if (distance === 0) {
                    scale = 1.8 // Hovered item
                    zIndex = 30
                    opacity = 1
                  } else if (distance === 1) {
                    scale = 1.4 // Adjacent items
                    zIndex = 20
                    opacity = 0.95
                  } else if (distance === 2) {
                    scale = 1.1 // Second ring
                    zIndex = 15
                    opacity = 0.9
                  } else {
                    scale = 0.85 // Far items
                    zIndex = 5
                    opacity = 0.75
                  }
                }

                return (
                  <motion.div
                    key={tool.name}
                    className="relative"
                    style={{ zIndex }}
                    animate={{ 
                      scale,
                      opacity
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 200, 
                      damping: 30,
                      mass: 0.8
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                  >
                    <motion.div
                      className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-white rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center cursor-pointer relative overflow-hidden group border border-gray-200/50"
                      whileHover={{ 
                        boxShadow: `0 8px 25px ${tool.color}50`,
                        y: -2
                      }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      onClick={() => handleToolClick(tool.slug)}
                    >
                      {/* Background gradient overlay */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl"
                        style={{ 
                          background: `linear-gradient(135deg, ${tool.color}60, ${tool.color}30)` 
                        }}
                      />
                      
                      {/* Tool logo */}
                      <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 relative z-10 p-0.5">
                        {tool.logo}
                      </div>
                      
                      {/* Hover tooltip - hidden on mobile for performance */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        whileHover={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="hidden sm:block absolute -bottom-8 sm:-bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-50 shadow-xl"
                      >
                        {tool.name}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Central hub behind the grid */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center -z-10"
        animate={{ scale: hoveredIndex !== null ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center opacity-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="text-white text-sm sm:text-base lg:text-lg"
          >
            🔗
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}