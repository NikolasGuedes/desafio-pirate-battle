export function OrientationGuard() {
  return (
    <div className="orientation-guard" role="dialog" aria-modal="true" aria-labelledby="orientation-title">
      <div className="orientation-phone" aria-hidden="true">
        <span />
      </div>
      <h1 id="orientation-title">Rotate your device</h1>
      <p>Pirate Battle is designed to be played in landscape mode.</p>
    </div>
  );
}
