import { spec } from '@/lib/swagger';
import SwaggerUIComponent from './SwaggerUIComponent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top-Down Shooter API Documentation',
};

export default function DocsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Top-Down Shooter API Documentation</h1>
      <SwaggerUIComponent spec={spec} />
    </div>
  );
}
