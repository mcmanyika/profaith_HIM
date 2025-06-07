const FormInput = ({ type, value, onChange, placeholder }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
  />
);

export default FormInput; 