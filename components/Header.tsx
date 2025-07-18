import { Container, Group, Text } from '@mantine/core'
import classes from '@/styles/Header.module.css'
import { PageConfigLink } from '@/types/config'

export default function Header({ pageConfig }: { pageConfig: any }) {
  // Ensure pageConfig has default values
  const safePageConfig = pageConfig || { title: 'Status Monitor', links: [] };
  const title = safePageConfig.title || 'Status Monitor';
  
  const linkToElement = (link: PageConfigLink) => {
    return (
      <a
        key={link.label}
        href={link.link}
        target="_blank"
        className={classes.link}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }
  return (
    <header className={classes.header}>
      <Container size="lg" style={{ maxWidth: '1200px' }} className={classes.inner}>
        <div className={classes.title}>
          <Text size="xl" fw={700}>{title}</Text>
        </div>
        <Group gap={5} visibleFrom="sm" style={{ maxWidth: '850px', width: '100%' }}>
          {safePageConfig.links?.map(linkToElement)}
        </Group>
        <Group gap={5} hiddenFrom="sm" style={{ maxWidth: '850px', width: '100%' }}>
          {safePageConfig.links?.filter((link: PageConfigLink) => link.highlight).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
