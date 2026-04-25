import Alumni from '../models/Alumni';

export const listAlumni = (tenantId: string, filters: { year?: number; department?: string; mentoring?: boolean } = {}) => {
  const query: Record<string, any> = { tenantId, isActive: true };
  if (filters.year) query.graduationYear = filters.year;
  if (filters.department) query.department = { $regex: filters.department, $options: 'i' };
  if (filters.mentoring === true) query.isAvailableForMentoring = true;
  return Alumni.find(query).sort({ graduationYear: -1, firstName: 1 });
};

export const getAlumniById = (id: string, tenantId: string) =>
  Alumni.findOne({ _id: id, tenantId, isActive: true });

export const createAlumni = (tenantId: string, data: Record<string, any>) =>
  Alumni.create({ tenantId, ...data });

export const updateAlumni = (id: string, tenantId: string, data: Record<string, any>) =>
  Alumni.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });

export const deleteAlumni = (id: string, tenantId: string) =>
  Alumni.findOneAndUpdate({ _id: id, tenantId }, { isActive: false }, { new: true });

export const getAlumniStats = async (tenantId: string) => {
  const alumni = await Alumni.find({ tenantId, isActive: true }).lean();
  const total = alumni.length;
  const mentors = alumni.filter(a => a.isAvailableForMentoring).length;

  const byYear = alumni.reduce<Record<number, number>>((acc, a) => {
    acc[a.graduationYear] = (acc[a.graduationYear] || 0) + 1;
    return acc;
  }, {});

  const byDept = alumni.reduce<Record<string, number>>((acc, a) => {
    if (a.department) acc[a.department] = (acc[a.department] || 0) + 1;
    return acc;
  }, {});

  const topCompanies = alumni
    .filter(a => a.currentCompany)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.currentCompany!] = (acc[a.currentCompany!] || 0) + 1;
      return acc;
    }, {});

  return {
    total,
    mentors,
    byYear: Object.entries(byYear).map(([year, count]) => ({ year: Number(year), count })).sort((a, b) => b.year - a.year),
    byDept: Object.entries(byDept).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count),
    topCompanies: Object.entries(topCompanies).map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
};
