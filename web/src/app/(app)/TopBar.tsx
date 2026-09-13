import Image from 'next/image';
import styles from './top-bar.module.css';

export default function TopBar({ title }: { title: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={92} height={38} className={styles.logo} priority />
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.accent} />
    </div>
  );
}
