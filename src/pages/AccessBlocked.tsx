export default function AccessBlocked({ message, terms }: { message?: string; terms?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Access Restricted</h1>
        <p className="text-muted-foreground">{message || 'Unable to access site. Refer to Terms and Conditions or contact support.'}</p>
        {terms && (
          <a className="text-primary underline" href={terms}>View Terms and Conditions</a>
        )}
        <p className="text-sm text-muted-foreground">Need help? Email admin@placementbridge.org</p>
      </div>
    </div>
  );
}
