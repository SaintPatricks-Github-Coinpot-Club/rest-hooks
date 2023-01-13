import { AsyncBoundary } from '@rest-hooks/react';
import Head from 'next/head';
import Image from 'next/image';

import AssetPrice from './AssetPrice';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>NextJS + Rest Hooks = ❤️</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a> with{' '}
          <a href="https://resthooks.io">Rest Hooks</a>
        </h1>

        <h2 className={styles.subtitle}>
          Here we show the live price of BTC using Rest Hooks
        </h2>

        <p className={styles.price}>
          <AsyncBoundary>
            <AssetPrice symbol="BTC" />
          </AsyncBoundary>
        </p>

        <p>
          No fetch requests took place on the client. Even when performing
          client-side navigation.
        </p>

        <p>
          This is because Rest Hooks serializes its normalized store so it is
          ready to use the data in new contexts
        </p>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
}
