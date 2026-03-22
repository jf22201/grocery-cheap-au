type LoadingPageProps = {
  message?: string;
  fullScreen?: boolean;
};

export default function LoadingPage({
  message = "Loading...",
  fullScreen = true,
}: LoadingPageProps) {
  return (
    <div
      className={`flex w-full items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-40"}`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
