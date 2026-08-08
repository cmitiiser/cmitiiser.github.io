if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", () => {

  const minimumDisplayTime = new Promise(resolve => setTimeout(resolve, 100));
  
  const pageHasLoaded = new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });

  const idealLoad = Promise.all([pageHasLoaded, minimumDisplayTime]);

  const maxTimeout = new Promise(resolve => setTimeout(resolve, 20000));

  Promise.race([idealLoad, maxTimeout]).then(() => {
    const loader = document.getElementById("preloader");
    
    if (loader) {
      loader.classList.add("preloader-hidden");
      
      // Notify main script that layout is visible so CodeMirror can refresh
      window.dispatchEvent(new Event('preloaderDone'));
      
      document.body.classList.add("hero-start");
      
      const handleTransitionEnd = (e) => {
        if (e.target === loader && e.propertyName === 'opacity') {
          loader.removeEventListener('transitionend', handleTransitionEnd);
          loader.remove();
        }
      };

      loader.addEventListener('transitionend', handleTransitionEnd);

      setTimeout(() => {
        if (document.body.contains(loader)) {
          loader.remove();
        }
      }, 700);
    }
  });
});

window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});