import { SettingsButton } from '../components/SettingsButton.tsx';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import styles from './Page.module.css';

/** 방침을 마지막으로 고친 날. 내용을 바꾸면 같이 바꾼다. */
const UPDATED = '2026년 11월 19일';
const CONTACT = 'https://github.com/SeonminKim1/pj-web-app-quiz2/issues';

/**
 * 개인정보처리방침(/privacy). 플레이스토어 등록에 쓰는 공개 주소다.
 * 앱이 실제로 하는 일과 어긋나면 안 되므로, 저장·통계·공유·광고를 바꿀 때 이 글도 고친다.
 */
export function PrivacyPage(): ReactElement {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← 처음으로
        </Link>
        <SettingsButton />
      </header>
      <article className={styles.doc}>
        <h1>개인정보처리방침</h1>
        <p>
          게임 놀이터(웹사이트와 안드로이드 앱)는 회원 가입이나 로그인이 없고,
          이름·연락처·위치 같은 개인정보를 받지 않아요.
        </p>

        <h2>기기에만 저장하는 정보</h2>
        <ul>
          <li>푼 문제, 골드, 연 힌트, 받은 스티커 같은 진행 상황</li>
          <li>고른 방해꾼, 소리·음악·움직임 줄이기 같은 설정</li>
          <li>친구한테 문제를 낼 때 적은 닉네임</li>
        </ul>
        <p>
          이 정보는 쓰고 있는 기기의 브라우저(앱) 저장소에만 남고, 운영자에게
          보내지 않아요. 앱을 지우거나 사이트 데이터를 지우면 함께 사라져요.
        </p>

        <h2>이용 통계</h2>
        <p>
          어떤 문제가 많이 공유되는지 알기 위해{' '}
          <a href="https://www.goatcounter.com/help/privacy">GoatCounter</a>로
          페이지 방문과 공유 버튼 사용 횟수를 셉니다. 방문한 페이지 주소(문제
          번호 포함), 브라우저 종류, 화면 크기, 들어온 경로처럼 통계에 필요한
          정보만 가고, 닉네임은 보내지 않아요. 쿠키를 쓰지 않고, 한 사람을
          알아보는 데 쓰지 않아요.
        </p>
        <p>
          사이트를 전달하는 호스팅 업체(Netlify)는 여느 웹 서버처럼 접속 기록을
          잠시 남길 수 있어요.
        </p>

        <h2>공유 링크</h2>
        <p>
          친구한테 문제를 낼 때 닉네임을 적으면 그 닉네임이 링크 주소에 들어가,
          링크를 받은 사람에게 보여요. 운영자 쪽에 따로 저장하지는 않아요.
        </p>

        <h2>광고</h2>
        <p>
          지금은 광고가 없어요. 광고를 넣게 되면 그 전에 이 방침을 먼저 고쳐
          알릴게요.
        </p>

        <h2>문의</h2>
        <p>
          궁금한 점은 <a href={CONTACT}>GitHub 문의 게시판</a>에 남겨 주세요.
        </p>

        <p className={styles.docUpdated}>마지막으로 고친 날: {UPDATED}</p>
      </article>
    </main>
  );
}
