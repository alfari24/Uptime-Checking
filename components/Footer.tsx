import { Container, Text, Group, Anchor } from '@mantine/core';

import { PageConfig, PageConfigLink } from '@/types/config';

export default function Footer({ pageConfig = { title: 'Status Monitor', links: [] } }: { pageConfig?: PageConfig }) {
  const currentYear = new Date().getFullYear();
  console.log('Footer received pageConfig:', JSON.stringify(pageConfig, null, 2));
  
  // Safeguard against undefined pageConfig
  if (!pageConfig) {
    pageConfig = { title: 'Status Monitor', links: [] };
  }
  
  // Ensure we have valid defaults if pageConfig is incomplete
  const title = pageConfig.title || 'Status Monitor';
  
  // Ensure links is always an array even if it's undefined or null
  let links: PageConfigLink[] = [];
  if (pageConfig.links && Array.isArray(pageConfig.links)) {
    links = pageConfig.links;
  }
  
  console.log('Processed title:', title);
  console.log('Processed links:', JSON.stringify(links, null, 2));

  return (
    <div style={{ 
      borderTop: '1px solid #eaeaea',
      marginTop: '2rem',
      paddingTop: '1rem',
      paddingBottom: '1rem',
    }}>
      <Container size="lg" style={{ maxWidth: '1200px' }}>
        <Group justify="space-between" wrap="wrap">          <Text size="sm" c="dimmed">
            © {currentYear} {title}. All rights reserved.
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {links.map((link: PageConfigLink, index: number) => (
              <div key={`${link.link}-${index}`} style={{ display: 'flex', alignItems: 'center' }}>
                <Anchor href={link.link} target="_blank" size="sm" c="dimmed">
                  {link.label}
                </Anchor>
                {index < links.length - 1 && (
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
