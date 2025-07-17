import { Container, Group, Text } from '@mantine/core'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/frontend.config'
import { PageConfigLink } from '@/types/config'

export default function Header() {
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
        <div>
          <a href="https://github.com/lyc8503/UptimeFlare" target="_blank">
            <Text size="xl" span>
              🕒
            </Text>
            <Text
              size="xl"
              span
              fw={700}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            >
              UptimeFlare
            </Text>
          </a>
        </div>        <Group gap={5} visibleFrom="sm" style={{ maxWidth: '850px', width: '100%' }}>
          {pageConfig.links?.map(linkToElement)}
        </Group>        <Group gap={5} hiddenFrom="sm" style={{ maxWidth: '850px', width: '100%' }}>
          {pageConfig.links?.filter((link) => link.highlight).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
