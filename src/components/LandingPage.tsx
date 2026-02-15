type LandingPageProps = {
  onEnterUser: () => void;
  onEnterAdmin: () => void;
};

function LandingPage({ onEnterUser, onEnterAdmin }: LandingPageProps) {
  return (
    <section className="landing-card">
      <h1>Campus Rooms</h1>
      <p>Manage room bookings for classes and events.</p>
      <div className="landing-actions">
        <button type="button" onClick={onEnterUser}>
          Continue as User
        </button>
        <button type="button" onClick={onEnterAdmin}>
          Continue as Admin
        </button>
      </div>
    </section>
  );
}

export default LandingPage;
