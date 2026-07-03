import { LessonStatus } from '@prisma/client';
export declare enum ResourceType {
    WORKSHEET = "WORKSHEET",
    READING_MATERIAL = "READING_MATERIAL",
    HANDOUT = "HANDOUT",
    EXAM_PREP = "EXAM_PREP",
    OTHER = "OTHER"
}
export declare enum SubmissionStatus {
    PENDING = "PENDING",
    SUBMITTED = "SUBMITTED",
    GRADED = "GRADED",
    LATE = "LATE",
    MISSING = "MISSING"
}
export declare class CreateHomeworkDto {
    title?: string;
    description?: string;
    instructions?: string;
    dueDate?: string;
    totalPoints?: number;
    isExamPrep?: boolean;
    isLocked?: boolean;
}
export declare class CreateResourceDto {
    title: string;
    description?: string;
    resourceType: ResourceType;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    isLocked?: boolean;
}
export declare class CreateLessonBundleDto {
    title: string;
    objective?: string;
    lessonContent?: string;
    grade: number;
    section: string;
    stream?: string;
    academicYearId: string;
    semesterId?: string;
    subjectId: string;
    lessonDate: string;
    periodNumber: number;
    homework?: CreateHomeworkDto;
    unitNumber?: number;
    topicName?: string;
    competency?: string;
    status?: LessonStatus;
    isExamPrep?: boolean;
    syllabusMappingId?: string;
    resources?: CreateResourceDto[];
}
export declare class UpdateLessonBundleDto {
    title?: string;
    titleAmharic?: string;
    objective?: string;
    objectiveAmharic?: string;
    lessonContent?: string;
    lessonContentAmharic?: string;
    periodNumber?: number;
    unitNumber?: number;
    topicName?: string;
    topicId?: string;
    competency?: string;
    homework?: CreateHomeworkDto;
    status?: LessonStatus;
    isExamPrep?: boolean;
    syllabusMappingId?: string;
}
export declare class SubmitHomeworkDto {
    submissionUrl?: string;
    submissionText?: string;
}
export declare class GradeHomeworkDto {
    grade: number;
    feedback?: string;
}
export declare class LessonCoverageQueryDto {
    grade: number;
    subjectId: string;
    academicYearId?: string;
    unitNumber?: number;
}
