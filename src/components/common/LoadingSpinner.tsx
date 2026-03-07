export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-cosmic-light-teal" />
    </div>
  );
}
