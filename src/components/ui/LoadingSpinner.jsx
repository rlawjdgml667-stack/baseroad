export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
    </div>
  );
}