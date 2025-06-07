import ErrorMessage from './ErrorMessage';

const VerificationStep = ({ 
  title, 
  value, 
  onChange, 
  onVerify, 
  onResend, 
  error,
  maxLength = 6,
  placeholder = "Enter verification code"
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 uppercase text-center">{title}</h2>
      <ErrorMessage message={error} />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition"
        maxLength={maxLength}
      />
      <button 
        onClick={onVerify} 
        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium text-sm"
      >
        Verify
      </button>
      <div className="text-center">
        <button 
          onClick={onResend} 
          className="text-sm text-gray-600 hover:text-black transition duration-200"
        >
          Resend verification code
        </button>
      </div>
    </div>
  </div>
);

export default VerificationStep; 