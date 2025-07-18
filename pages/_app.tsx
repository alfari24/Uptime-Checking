import '@mantine/core/styles.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core'
import NoSsr from '@/components/NoSsr'
import Header from '@/components/Header'

export default function App({ Component, pageProps }: AppProps) {
  // Extract pageConfig from props or use fallback
  const { pageConfig = { title: 'Status Monitor', links: [] } } = pageProps;
  
  return (
    <NoSsr>
      <MantineProvider defaultColorScheme="light">
        <Header pageConfig={pageConfig} />
        <Component {...pageProps} />
      </MantineProvider>
    </NoSsr>
  )
}
