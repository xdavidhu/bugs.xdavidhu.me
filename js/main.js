window.onload = function() {

    function addClass(element, className) {
        element.className += " " + className;
    }

    function removeClass(element, className) {
        // Capture any surrounding space characters to prevent repeated
        // additions and removals from leaving lots of spaces.
        var classNameRegEx = new RegExp("\\s*" + className + "\\s*");
        element.className = element.className.replace(classNameRegEx, " ");
    }

    function toggleClass(element, className) {
        if (!element || !className) {
            return;
        }

        if (element.className.indexOf(className) === -1) {
            addClass(element, className);
        } else {
            removeClass(element, className);
        }
    }

    // Gallery navigation
    document.querySelectorAll('.gallery').forEach(function(gallery) {
        var track = gallery.querySelector('.gallery-track');
        var prev = gallery.querySelector('.gallery-prev');
        var next = gallery.querySelector('.gallery-next');

        function slideWidth() {
            var slide = track.querySelector('.gallery-slide');
            return slide ? slide.offsetWidth + 20 : 0;
        }

        function updateButtons() {
            var atStart = track.scrollLeft <= 1;
            var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
            if (prev) prev.style.display = atStart ? 'none' : 'flex';
            if (next) next.style.display = atEnd ? 'none' : 'flex';
        }

        function updateEdgeMargins() {
            var containerWidth = track.clientWidth;
            var slides = track.querySelectorAll('.gallery-slide');
            var first = slides[0];
            var last = slides[slides.length - 1];
            if (first) first.style.marginLeft = Math.max(0, (containerWidth - first.offsetWidth) / 2) + 'px';
            if (last && last !== first) last.style.marginRight = Math.max(0, (containerWidth - last.offsetWidth) / 2) + 'px';
        }

        track.addEventListener('scroll', updateButtons);
        updateButtons();
        track.querySelectorAll('img').forEach(function(img) {
            img.addEventListener('load', function() {
                updateEdgeMargins();
                updateButtons();
            });
        });
        updateEdgeMargins();

        if (prev) {
            prev.addEventListener('click', function() {
                track.scrollBy({ left: -slideWidth(), behavior: 'smooth' });
            });
        }

        if (next) {
            next.addEventListener('click', function() {
                track.scrollBy({ left: slideWidth(), behavior: 'smooth' });
            });
        }
    });

    // Lightbox
    var lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = '<button id="lightbox-close">&times;</button>' +
        '<button class="lightbox-nav" id="lightbox-prev"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>' +
        '<img>' +
        '<button class="lightbox-nav" id="lightbox-next"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg></button>';
    document.body.appendChild(lightbox);

    var lightboxImg = lightbox.querySelector('img');
    var lightboxClose = lightbox.querySelector('#lightbox-close');
    var lightboxPrev = lightbox.querySelector('#lightbox-prev');
    var lightboxNext = lightbox.querySelector('#lightbox-next');
    var lightboxSrcs = [];
    var lightboxIndex = 0;

    function setLightboxImage(src) {
        lightboxImg.classList.remove('lb-anim');
        void lightboxImg.offsetWidth;
        lightboxImg.classList.add('lb-anim');
        lightboxImg.src = src;
    }

    function updateLightboxNav() {
        lightboxPrev.style.display = (lightboxSrcs.length > 1 && lightboxIndex > 0) ? 'flex' : 'none';
        lightboxNext.style.display = (lightboxSrcs.length > 1 && lightboxIndex < lightboxSrcs.length - 1) ? 'flex' : 'none';
    }

    function lightboxStep(dir) {
        var next = lightboxIndex + dir;
        if (next >= 0 && next < lightboxSrcs.length) {
            lightboxIndex = next;
            setLightboxImage(lightboxSrcs[lightboxIndex]);
            updateLightboxNav();
        }
    }

    function openLightbox(src, srcs, index) {
        lightboxSrcs = srcs || [];
        lightboxIndex = index || 0;
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateLightboxNav();
    }

    function closeLightbox() {
        lightbox.classList.add('closing');
        lightbox.addEventListener('animationend', function handler() {
            lightbox.classList.remove('active', 'closing');
            lightboxImg.src = '';
            lightboxSrcs = [];
            document.body.style.overflow = '';
            lightbox.removeEventListener('animationend', handler);
        });
    }

    lightbox.addEventListener('click', closeLightbox);
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function(e) { e.stopPropagation(); lightboxStep(-1); });
    lightboxNext.addEventListener('click', function(e) { e.stopPropagation(); lightboxStep(1); });

    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft')  lightboxStep(-1);
        if (e.key === 'ArrowRight') lightboxStep(1);
    });

    var touchStartX = 0;
    lightbox.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function(e) {
        var diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) lightboxStep(diff > 0 ? 1 : -1);
    });

    document.querySelectorAll('.single-wrap img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            var galleryTrack = this.closest('.gallery-track');
            if (galleryTrack) {
                var imgs = Array.from(galleryTrack.querySelectorAll('.gallery-slide img'));
                var srcs = imgs.map(function(i) { return i.src; });
                openLightbox(this.src, srcs, imgs.indexOf(this));
            } else {
                openLightbox(this.src);
            }
        });
    });

    // Open Twitter/share in a Pop-Up
    // var $popup = document.getElementsByClassName('popup')[0];
    // if (!$popup) {
    //     return;
    // }
    // $popup.addEventListener('click', function(e) {
    //     e.preventDefault()
    //     var width  = 575,
    //         height = 400,
    //         left   = (document.documentElement.clientWidth  - width)  / 2,
    //         top    = (document.documentElement.clientHeight - height) / 2,
    //         url    = this.href,
    //         opts   = 'status=1' +
    //                  ',width='  + width  +
    //                  ',height=' + height +
    //                  ',top='    + top    +
    //                  ',left='   + left;

    //     window.open(url, 'twitter', opts);

    //     return false;
    // });
}
