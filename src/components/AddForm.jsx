import { useState } from "react";
import { motion } from "framer-motion";
import { chessMastersBackend } from "../../config";

export const AddForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    UserName: "",
    Email: "",
    Password: "",
    ConfirmPassword: "",
    Role: "",
    Level: "",
    Fide_id: "",
    Status: "Active",
  });

  const inputClasses =
    "w-full p-2 sm:p-2.5 md:p-3 text-sm sm:text-base bg-white text-gray-800 border border-brand-accent/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all duration-300";

  const isAlphanumeric = (str) => /^[a-zA-Z0-9]+$/.test(str);
  const isValidPassword = (pwd) => pwd.length >= 6;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isAlphanumeric(formData.UserName)) {
      alert("Username must contain only alphanumeric characters");
      return;
    }

    if (!isValidPassword(formData.Password)) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if (formData.Password !== formData.ConfirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const finalData = {
      UserName: formData.UserName,
      Email: formData.Email,
      Password: formData.Password,
      Role: formData.Role,
      Status: "Active",
      ...(formData.Role === "player" && { Level: formData.Level }),
      ...(formData.Role === "coach" && { Fide_id: formData.Fide_id }),
    };

    console.log("Final Form Data:", finalData);
    onSubmit(finalData);
    onClose();
  };

  return (
    <div className="z-50 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-brand-surface shadow-lg rounded-xl p-4 sm:p-5 md:p-6 w-full max-w-md mx-auto border border-brand-accent/30"
      >
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-brand-ink mb-4">
          Add New User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Username */}
          <div>
            <input
              type="text"
              name="UserName"
              placeholder="Username"
              value={formData.UserName}
              onChange={handleChange}
              className={inputClasses}
              required
            />
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              name="Email"
              placeholder="Email"
              value={formData.Email}
              onChange={handleChange}
              className={inputClasses}
              required
            />
          </div>

          {/* Password */}
          <div>
            <input
              type="password"
              name="Password"
              placeholder="Password"
              value={formData.Password}
              onChange={handleChange}
              className={inputClasses}
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <input
              type="password"
              name="ConfirmPassword"
              placeholder="Confirm Password"
              value={formData.ConfirmPassword}
              onChange={handleChange}
              className={inputClasses}
              required
            />
          </div>

          {/* Role Selection */}
          <div>
            <select
              name="Role"
              value={formData.Role}
              onChange={handleChange}
              className={inputClasses}
              required
            >
              <option value="" disabled hidden>
                Select Role
              </option>
              <option value="player">Player</option>
              <option value="coach">Coach</option>
            </select>
          </div>

          {/* Conditional Fields */}
          {formData.Role === "coach" && (
            <div>
              <input
                type="text"
                name="Fide_id"
                placeholder="FIDE ID"
                value={formData.Fide_id}
                onChange={handleChange}
                className={inputClasses}
                required
              />
            </div>
          )}

          {formData.Role === "player" && (
            <div>
              <select
                name="Level"
                value={formData.Level}
                onChange={handleChange}
                className={inputClasses}
                required
              >
                <option value="" disabled hidden>
                  Select Level
                </option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-2 sm:space-x-3">
            <motion.button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-brand-action text-white font-semibold rounded-lg hover:bg-brand-actionHover transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Submit
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};




