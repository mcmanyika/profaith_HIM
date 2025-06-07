const ErrorMessage = ({ message }) => (
  message && (
    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
      {message}
    </div>
  )
);

export default ErrorMessage; 