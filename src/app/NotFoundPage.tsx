import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to Orders</Link>
      </p>
    </div>
  );
}
