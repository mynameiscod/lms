"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseService = void 0;
const Course_1 = __importDefault(require("../models/Course"));
class CourseService {
    async createCourse(courseData) {
        const course = new Course_1.default(courseData);
        await course.save();
        return course.populate('instructor', 'firstName lastName email');
    }
    async getCoursesByTenant(tenantId, filters = {}) {
        const query = { tenantId, ...filters };
        return await Course_1.default.find(query)
            .populate('instructor', 'firstName lastName email')
            .sort({ createdAt: -1 });
    }
    async getCourseById(courseId) {
        return await Course_1.default.findById(courseId).populate('instructor');
    }
    async updateCourse(courseId, updateData) {
        return await Course_1.default.findByIdAndUpdate(courseId, updateData, { new: true })
            .populate('instructor', 'firstName lastName email');
    }
    async deleteCourse(courseId) {
        return await Course_1.default.findByIdAndDelete(courseId);
    }
    async publishCourse(courseId) {
        return await Course_1.default.findByIdAndUpdate(courseId, { isPublished: true }, { new: true });
    }
    async incrementSubjectCount(courseId) {
        await Course_1.default.findByIdAndUpdate(courseId, { $inc: { subjectCount: 1 } });
    }
    async decrementSubjectCount(courseId) {
        await Course_1.default.findByIdAndUpdate(courseId, { $inc: { subjectCount: -1 } });
    }
}
exports.CourseService = CourseService;
//# sourceMappingURL=courseService.js.map