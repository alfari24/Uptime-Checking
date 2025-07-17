import { Container, Text, Group, Anchor } from '@mantine/core';
import { pageConfig } from '@/frontend.config';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div style={{ 
      borderTop: '1px solid #eaeaea',
      marginTop: '2rem',
      paddingTop: '1rem',
      paddingBottom: '1rem',
    }}>
      <Container size="lg" style={{ maxWidth: '1200px' }}>
        <Group justify="space-between" wrap="wrap">          <Text size="sm" c="dimmed">
            © {currentYear} {pageConfig.title || 'Alfari Status Page'}. All rights reserved.
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pageConfig.links?.map((link, index) => (
              <div key={link.link} style={{ display: 'flex', alignItems: 'center' }}>
                <Anchor href={link.link} size="sm" c="dimmed">
                  {link.label}
                </Anchor>
                {index < (pageConfig.links?.length || 0) - 1 && (
                  <Text size="sm" c="dimmed" style={{ margin: '0 0.5rem' }}>•</Text>
                )}
              </div>
            ))}
          </div>
        </Group>
      </Container>
    </div>
  );
}
