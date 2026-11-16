import React from 'react';
import { STATUS_LABEL, TalentStatus } from '../../api/talentPoolApi';

const CLS: Record<TalentStatus, string> = {
  shared: 'blue', viewed: 'grey', shortlisted: 'violet', interview: 'amber', selected: 'green', rejected: 'red', on_hold: 'grey',
};
export const StatusPill: React.FC<{ s: TalentStatus }> = ({ s }) => <span className={`tp-pill ${CLS[s] || 'grey'}`}>{STATUS_LABEL[s] || s}</span>;

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
