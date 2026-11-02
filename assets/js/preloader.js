if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", () => {

  const minimumDisplayTime = new Promise(resolve => setTimeout(resolve, 1000));
  
  const pageHasLoaded = new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });

  // Gathers all <img> elements and waits for them to load or fail (to prevent hanging)
  const imagesLoaded = Promise.all(
    Array.from(document.images).map(img => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    })
  );

  const idealLoad = Promise.all([pageHasLoaded, imagesLoaded, minimumDisplayTime]);

  const maxTimeout = new Promise(resolve => setTimeout(resolve, 10000));

  Promise.race([idealLoad, maxTimeout]).then(() => {
    const loader = document.getElementById("preloader");
    
    if (loader) {
      loader.classList.add("preloader-hidden");
      
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
