import { AsyncBoundary } from '@data-client/react';
import { styled } from '@linaria/react';
import { memo } from 'react';
import LoadingBar from 'components/LoadingBar';
import Home from 'pages/Home';
import 'style/main.css';
import UserSelection from 'pages/Home/UserSelection';
import useNavigationState from 'useNavigationState';

function App() {
  const [userId, setUserId, loading] = useNavigationState(1);

  return (
    <AppContainer>
      <LoadingBar duration={500} loading={loading} />
      <AppNav>
        <NavInner>
          <NavBrand>Todos</NavBrand>
          <AsyncBoundary fallback={<NavLoading>loading…</NavLoading>}>
            <UserSelection userId={userId} setUserId={setUserId} />
          </AsyncBoundary>
        </NavInner>
      </AppNav>
      <Home userId={userId} />
    </AppContainer>
  );
}
export default memo(App);

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const AppNav = styled.nav`
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
`;

const NavInner = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const NavBrand = styled.div`
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  color: var(--accent-bright);
  letter-spacing: -0.02em;
  white-space: nowrap;
  user-select: none;
`;

const NavLoading = styled.div`
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.05em;
`;
