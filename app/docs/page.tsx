import { spec } from '@/lib/swagger';
import SwaggerUIComponent from './SwaggerUIComponent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pong API Documentation',
};

export default function DocsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Pong API Documentation</h1>
      <SwaggerUIComponent spec={spec} />
    </div>
  );
}
