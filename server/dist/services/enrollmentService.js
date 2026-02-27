"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentService = void 0;
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const Course_1 = __importDefault(require("../models/Course"));
class EnrollmentService {
    async enrollStudent(userId, courseId, tenantId) {
        const existingEnrollment = await Enrollment_1.default.findOne({
            userId,
            courseId,
            tenantId
        });
        if (existingEnrollment) {
            throw new Error('Student already enrolled in this course');
        }
        const enrollment = new Enrollment_1.default({ userId, courseId, tenantId });
        await enrollment.save();
        await Course_1.default.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
        return enrollment;
    }
    async getStudentEnrollments(userId, tenantId) {
        return await Enrollment_1.default.find({ userId, tenantId }).populate('courseId');
    }
    async getCourseEnrollments(courseId) {
        return await Enrollment_1.default.find({ courseId }).populate('userId', 'firstName lastName email');
    }
    async updateEnrollmentProgress(enrollmentId, progress) {
        return await Enrollment_1.default.findByIdAndUpdate(enrollmentId, { progress }, { new: true });
    }
    async completeEnrollment(enrollmentId) {
        return await Enrollment_1.default.findByIdAndUpdate(enrollmentId, { status: 'completed', progress: 100, completedAt: new Date() }, { new: true });
    }
}
exports.EnrollmentService = EnrollmentService;
//# sourceMappingURL=enrollmentService.js.map