export default function HomeButton() {
  return (
    <a
      href="#home"
      className="fixed top-5 left-5 z-50 bg-black shadow-lg rounded-full p-3 hover:bg-gray-800 transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-gray-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5L12 3l9 7.5M5 9.75V21h14V9.75"
        />
      </svg>
    </a>
  );
}