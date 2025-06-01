"use client";
import React, { useState, ChangeEvent } from "react";
import { X, Plus } from "lucide-react";
import Image from "next/image";

interface Member {
  email: string;
  role: string;
  valid: boolean;
}

interface AddEmployeeModalProps {
  onClose: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose }) => {
  const [members, setMembers] = useState<Member[]>([
    { email: "", role: "", valid: true },
    { email: "", role: "", valid: true },
  ]);

  const handleAddRow = () => {
    if (members.length < 5) {
      setMembers([...members, { email: "", role: "", valid: true }]);
    }
  };

  const validateEmail = (email: string) => {
    // Basic validation, can be improved
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.endsWith("@gmail.com");
  };

  const handleChange = (index: number, field: keyof Omit<Member, 'valid'>, value: string) => {
    const updated = [...members];
    updated[index][field] = value;

    if (field === "email") {
      updated[index].valid = validateEmail(value) || value === ""; // Valid if empty initially
    }

    setMembers(updated);
  };

  const isFormValid = members.every(
    (member) =>
      member.email.trim() &&
      member.role.trim() &&
      validateEmail(member.email)
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white w-[540px] max-w-[95%] rounded-xl p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
        >
          <X size={18} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="flex -space-x-4">
            {[1, 2, 3].map((i) => (
              <Image
                key={i}
                src="/assets/kob.jpg"
                alt="User"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            ))}
          </div>
        </div>

        <h2 className="text-center text-lg font-semibold text-black">
          Invite your team
        </h2>
        <p className="text-sm text-gray-600 text-center mt-1 mb-6">
          Add new users to invite to the team and notify them with email also add their roles.
        </p>

        <div className="space-y-4">
          {members.map((member, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <label className="block text-sm font-medium text-black mb-1">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={member.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, "email", e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm outline-none ${
                    member.email && !member.valid
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  }`}
                />
                {member.email && !member.valid && (
                  <p className="text-xs text-red-500 mt-1">
                    Must be a valid @gmail.com email.
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-black mb-1">
                  Role<span className="text-red-500">*</span>
                </label>
                <select
                  value={member.role}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange(index, "role", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Team Member">Team Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {members.length < 5 && (
          <div
            className="mt-4 flex items-center space-x-2 text-sm text-[#34BC68] cursor-pointer font-medium"
            onClick={handleAddRow}
          >
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#e4f7ec]">
              <Plus size={14} className="text-[#34BC68]" />
            </div>
            <span>Add another</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center sm:space-x-4 mt-8 space-y-2 sm:space-y-0">
          <button
            onClick={onClose}
            className="px-4 sm:px-24 py-2 border border-gray-300 rounded-md text-sm text-black w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            disabled={!isFormValid}
            onClick={onClose} // Assuming this will handle form submission or just close
            className={`px-4 sm:px-24 py-2 rounded-md text-sm w-full sm:w-auto ${
              isFormValid
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;