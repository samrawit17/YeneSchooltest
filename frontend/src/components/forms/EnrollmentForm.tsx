"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputField from "../InputField";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { registrarAPI, schoolSettingsAPI } from "@/lib/api";
import { enrollmentAPI } from "@/lib/api/enrollment";
import { getGradeRangeFromSystem } from "@/lib/grade-system";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters!" }),
  email: z.string().email({ message: "Invalid email address!" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters!" }),
  schoolId: z.string().min(1, { message: "School is required!" }),
  academicYear: z.string().min(1, { message: "Academic year is required!" }),
  grade: z.number().min(1).max(12, { message: "Grade must be between 1 and 12!" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required!" }),
  gender: z.enum(["male", "female", "other"], { message: "Gender is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
  phone: z.string().min(1, { message: "Phone number is required!" }),
  emergencyContact: z.string().min(1, { message: "Emergency contact is required!" }),
  guardianName: z.string().min(1, { message: "Guardian name is required!" }),
  guardianPhone: z.string().min(1, { message: "Guardian phone is required!" }),
  guardianEmail: z.string().email({ message: "Invalid email address!" }).optional().or(z.literal("")),
});

type Inputs = z.infer<typeof schema>;

const EnrollmentForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen?: (open: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [gradeRange, setGradeRange] = useState(() => getGradeRangeFromSystem("1-12"));

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await enrollmentAPI.getSchools();
        setSchools(response.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch schools:', error);
        toast.error('Failed to load schools. Please try again later.');
      } finally {
        setSchoolsLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Inputs>({
    resolver: zodResolver(schema),
  });

  const selectedSchoolId = watch("schoolId") || data?.schoolId;

  useEffect(() => {
    const loadGradeRange = async () => {
      if (!selectedSchoolId) {
        setGradeRange(getGradeRangeFromSystem("1-12"));
        return;
      }
      try {
        const response = await schoolSettingsAPI.getAll(selectedSchoolId);
        setGradeRange(getGradeRangeFromSystem(response.data?.grade_system || "1-12"));
      } catch (error) {
        setGradeRange(getGradeRangeFromSystem("1-12"));
      }
    };
    loadGradeRange();
  }, [selectedSchoolId]);

  const onSubmit = async (formData: Inputs) => {
    if (formData.grade < gradeRange.min || formData.grade > gradeRange.max) {
      toast.error(`Grade must be between ${gradeRange.min} and ${gradeRange.max}`);
      return;
    }
    setIsLoading(true);
    try {
      if (type === "create") {
        await registrarAPI.createStudent(formData);
        toast.success("Enrollment created successfully!");
      } else {
        await registrarAPI.updateStudent(data.id, formData);
        toast.success("Enrollment updated successfully!");
      }
      if (setOpen) {
        setOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Operation failed!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create Enrollment Request" : "Update Enrollment Request"}
      </h1>
      
      <span className="text-xs text-gray-400 font-medium">
        Account Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Full Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
          inputProps={{ placeholder: "Student's full name" }}
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
          inputProps={{ placeholder: "student@email.com" }}
        />
        {type === "create" && (
          <InputField
            label="Password"
            name="password"
            type="password"
            defaultValue={data?.password}
            register={register}
            error={errors?.password}
            inputProps={{ placeholder: "At least 8 characters" }}
          />
        )}
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Enrollment Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
         <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">School</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("schoolId")}
              defaultValue={data?.schoolId || ""}
              disabled={schoolsLoading}
            >
              <option value="">Select school</option>
              {schoolsLoading ? (
                <option value="" disabled>Loading schools...</option>
              ) : (
                schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))
              )}
            </select>
            {errors.schoolId?.message && (
              <p className="text-xs text-red-400">{errors.schoolId.message.toString()}</p>
            )}
          </div>
        <InputField
          label="Academic Year"
          name="academicYear"
          defaultValue={data?.academicYear}
          register={register}
          error={errors?.academicYear}
          inputProps={{ placeholder: "e.g., 2024-2025" }}
        />
        <InputField
          label="Grade"
          name="grade"
          type="number"
          defaultValue={data?.grade}
          register={register}
          error={errors?.grade}
          inputProps={{ placeholder: `${gradeRange.min}-${gradeRange.max}`, min: gradeRange.min, max: gradeRange.max }}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Details
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          defaultValue={data?.dateOfBirth}
          register={register}
          error={errors?.dateOfBirth}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Gender</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("gender")}
            defaultValue={data?.gender || ""}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender?.message && (
            <p className="text-xs text-red-400">{errors.gender.message.toString()}</p>
          )}
        </div>
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors?.address}
          inputProps={{ placeholder: "Complete address" }}
        />
        <InputField
          label="Phone Number"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors?.phone}
          inputProps={{ placeholder: "e.g., +1234567890" }}
        />
        <InputField
          label="Emergency Contact"
          name="emergencyContact"
          defaultValue={data?.emergencyContact}
          register={register}
          error={errors?.emergencyContact}
          inputProps={{ placeholder: "Emergency phone number" }}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Guardian Details
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Guardian Name"
          name="guardianName"
          defaultValue={data?.guardianName}
          register={register}
          error={errors?.guardianName}
          inputProps={{ placeholder: "Guardian's full name" }}
        />
        <InputField
          label="Guardian Phone"
          name="guardianPhone"
          defaultValue={data?.guardianPhone}
          register={register}
          error={errors?.guardianPhone}
          inputProps={{ placeholder: "Guardian's phone number" }}
        />
        <InputField
          label="Guardian Email"
          name="guardianEmail"
          type="email"
          defaultValue={data?.guardianEmail}
          register={register}
          error={errors?.guardianEmail}
          inputProps={{ placeholder: "Guardian's email address" }}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Documents (Optional)
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Documents</label>
          <input
            type="file"
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          />
          <p className="text-xs text-gray-400">
            Upload required documents (e.g., birth certificate, transcripts)
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <button
          type="button"
          onClick={() => setOpen && setOpen(false)}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Loading..." : type === "create" ? "Submit Enrollment" : "Update Enrollment"}
        </button>
      </div>
    </form>
  );
};

export default EnrollmentForm;
