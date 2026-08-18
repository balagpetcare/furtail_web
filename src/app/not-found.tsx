import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
      <p className="text-gray-600 mb-8">Could not find requested resource</p>
      <Link
        href="/"
        className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
