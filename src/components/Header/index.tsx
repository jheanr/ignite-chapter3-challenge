import Link from 'next/link';

import styles from './header.module.scss';

export function Header() {
  return (
    <header className={styles.header}>
      <Link href="/">
        <a>
          <img src="/logo.svg" alt="logo" />
        </a>
      </Link>
    </header>
  );
}
