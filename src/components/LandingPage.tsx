type LandingPageProps = {
  onSignIn: () => void;
  onRegister: () => void;
};

function LandingPage({ onSignIn, onRegister }: LandingPageProps) {
  return (
    <section className="landing-card">
      <h1>Campus Rooms</h1>
      <p>Manage room bookings for classes and events.</p>
      <div className="landing-actions">
        <button type="button" onClick={onSignIn}>
          Sign in
        </button>
        <button type="button" onClick={onRegister}>
          Register
        </button>
      </div>
    </section>
  );
}

export default LandingPage;
