const SESSION_KEY = "hta_member_session";

const state = {
    guests: [],
    members: [],
    hotels: [],
    reservations: [],
    reviews: [],
    likedReviewIds: new Set(),
    sessionMember: null,
};

const $ = (id) => document.getElementById(id);

function getSessionMember() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setSessionMember(member) {
    state.sessionMember = member;
    if (member) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(member));
    } else {
        sessionStorage.removeItem(SESSION_KEY);
    }
    renderSession();
    renderReservations();
    renderReviews();
}

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === "className") {
            node.className = value;
        } else if (key === "textContent") {
            node.textContent = value;
        } else if (key === "htmlFor") {
            node.htmlFor = value;
        } else if (key.startsWith("data-")) {
            node.setAttribute(key, value);
        } else {
            node.setAttribute(key, value);
        }
    });
    children.forEach((child) => {
        if (typeof child === "string") {
            node.appendChild(document.createTextNode(child));
        } else if (child) {
            node.appendChild(child);
        }
    });
    return node;
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (!response.ok) {
        const detail = body?.description || body?.message || response.statusText;
        throw new Error(`${options.method || "GET"} ${path} failed: ${detail}`);
    }

    return body;
}

function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("show"), 2200);
}

async function runAction(action, successMessage, button) {
    const originalText = button?.textContent;
    if (button) {
        button.disabled = true;
        button.textContent = "Working…";
    }

    try {
        await action();
        if (successMessage) toast(successMessage);
    } catch (error) {
        toast(error.message || "Something went wrong");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

function guestName(id) {
    const guest = state.guests.find((item) => item.guest_id === Number(id));
    return guest ? `${guest.first_name} ${guest.last_name}` : `Guest #${id}`;
}

function guestById(id) {
    return state.guests.find((item) => item.guest_id === Number(id)) || null;
}

function memberName(id) {
    const member = state.members.find((item) => item.member_id === Number(id));
    return member ? member.username : `Member #${id}`;
}

function hotelName(id) {
    const hotel = state.hotels.find((item) => item.hotel_id === Number(id));
    return hotel ? hotel.name : `Hotel #${id}`;
}

function guestsEligibleForMemberSignup() {
    const memberGuestIds = new Set(state.members.map((member) => member.guest_id));
    const guestIdsWithReservations = new Set(state.reservations.map((reservation) => reservation.guest_id));
    return state.guests.filter(
        (guest) => guestIdsWithReservations.has(guest.guest_id) && !memberGuestIds.has(guest.guest_id)
    );
}

function memberReservations() {
    if (!state.sessionMember?.guest_id) return [];
    return state.reservations.filter(
        (reservation) => reservation.guest_id === state.sessionMember.guest_id
    );
}

function calculateNights(arrival, departure) {
    if (!arrival || !departure) return null;
    const [ay, am, ad] = arrival.split("-").map(Number);
    const [dy, dm, dd] = departure.split("-").map(Number);
    const start = new Date(ay, am - 1, ad);
    const end = new Date(dy, dm - 1, dd);
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : null;
}

function updateNightsFromDates() {
    const nights = calculateNights($("arrivalDate").value, $("departureDate").value);
    if (nights !== null) {
        $("numberOfNights").value = String(nights);
    }
}

function dateOnly(value) {
    if (!value) return "";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    if (!year || !month || !day) return String(value);
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function setOptions(select, items, valueKey, labelFn, placeholder) {
    select.replaceChildren();
    if (!items.length && placeholder) {
        select.appendChild(el("option", { value: "", textContent: placeholder }));
        return;
    }
    items.forEach((item) => {
        select.appendChild(
            el("option", {
                value: String(item[valueKey]),
                textContent: labelFn(item),
            })
        );
    });
}

async function loadAll() {
    const [guests, members, hotels, reservations, reviews] = await Promise.all([
        api("/guests"),
        api("/members"),
        api("/hotels"),
        api("/reservations"),
        api("/reviews"),
    ]);

    Object.assign(state, { guests, members, hotels, reservations, reviews });
    await refreshSessionMember();
    await loadLikedReviews();
    render();
}

async function refreshSessionMember() {
    if (!state.sessionMember?.member_id) return;
    const fresh = state.members.find((member) => member.member_id === state.sessionMember.member_id);
    if (fresh) {
        state.sessionMember = fresh;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
    } else {
        setSessionMember(null);
    }
}

async function loadLikedReviews() {
    state.likedReviewIds = new Set();
    const memberId = state.sessionMember?.member_id;
    if (!memberId) return;
    try {
        const liked = await api(`/members/${memberId}/liked_reviews`);
        state.likedReviewIds = new Set(liked.map((review) => review.review_id));
    } catch {
        state.likedReviewIds = new Set();
    }
}

function render() {
    renderSelects();
    renderSession();
    renderHotels();
    renderReservations();
    renderReviews();
}

function renderSelects() {
    setOptions(
        $("memberGuestSelect"),
        guestsEligibleForMemberSignup(),
        "guest_id",
        (guest) => `${guest.first_name} ${guest.last_name} (${guest.email})`,
        "Book a stay first"
    );
    setOptions($("reservationHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
    setOptions($("reviewHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
}

function renderSession() {
    const signedInNode = $("signedInMember");
    const loginForm = $("loginForm");
    const memberForm = $("memberForm");
    const reviewForm = $("reviewForm");
    const reviewLoginPrompt = $("reviewLoginPrompt");

    if (state.sessionMember) {
        const guest = guestById(state.sessionMember.guest_id);
        signedInNode.replaceChildren(
            el("p", {
                textContent: `Signed in as ${state.sessionMember.username}${
                    guest ? ` (${guest.first_name} ${guest.last_name})` : ""
                }`,
            }),
            el("button", {
                type: "button",
                id: "signOutButton",
                className: "secondary",
                textContent: "Sign out",
            })
        );
        $("signOutButton").addEventListener("click", () => {
            setSessionMember(null);
            toast("Signed out");
        });

        signedInNode.classList.remove("hidden");
        loginForm.classList.add("hidden");
        memberForm.classList.add("hidden");
        reviewForm.classList.remove("hidden");
        reviewLoginPrompt.classList.add("hidden");
        $("memberSectionHint").textContent = "You are signed in. Post reviews and manage your stays below.";
        $("reservationsHint").textContent = "Reservations linked to your member account.";
    } else {
        signedInNode.replaceChildren();
        signedInNode.classList.add("hidden");
        loginForm.classList.remove("hidden");
        memberForm.classList.remove("hidden");
        reviewForm.classList.add("hidden");
        reviewLoginPrompt.classList.remove("hidden");
        $("memberSectionHint").textContent = "Sign in to post reviews and manage your stays.";
        $("reservationsHint").textContent = "Sign in to see reservations linked to your account.";
    }
}

function renderHotels() {
    const container = $("hotels");
    container.replaceChildren();

    if (!state.hotels.length) {
        container.appendChild(el("p", { className: "muted", textContent: "No hotels are listed yet." }));
        return;
    }

    state.hotels.forEach((hotel) => {
        container.appendChild(
            el("article", { className: "card" }, [
                el("h3", { textContent: hotel.name || `Hotel #${hotel.hotel_id}` }),
                el("p", { className: "muted", textContent: hotel.address || "Address unavailable" }),
                el("div", { className: "meta" }, [
                    el("span", { className: "pill", textContent: `${hotel.star_rating ?? "N/A"} stars` }),
                    el("span", { className: "pill", textContent: `${hotel.number_of_rooms ?? 0} rooms` }),
                ]),
            ])
        );
    });
}

function renderReservations() {
    const container = $("reservations");
    container.replaceChildren();

    if (!state.sessionMember) {
        container.appendChild(
            el("p", { className: "muted", textContent: "Sign in to see your reservations." })
        );
        return;
    }

    const reservations = memberReservations();
    if (!reservations.length) {
        container.appendChild(
            el("p", { className: "muted", textContent: "No reservations linked to your account yet." })
        );
        return;
    }

    reservations.forEach((reservation) => {
        const card = el("article", { className: "card" }, [
            el("h3", { textContent: hotelName(reservation.hotel_id) }),
            el("p", {
                textContent: `${guestName(reservation.guest_id)}, room ${reservation.room_number}`,
            }),
            el("p", {
                className: "muted",
                textContent: `${dateOnly(reservation.arrival_date)} to ${dateOnly(reservation.departure_date)}`,
            }),
            el("div", { className: "meta" }, [
                el("span", { className: "pill", textContent: `${reservation.number_of_nights} nights` }),
                el("span", { className: "pill", textContent: `Reservation #${reservation.reservation_id}` }),
            ]),
            el("button", {
                type: "button",
                className: "secondary",
                "data-cancel-reservation": String(reservation.reservation_id),
                textContent: "Cancel",
            }),
        ]);
        container.appendChild(card);
    });
}

function renderReviews() {
    const container = $("reviews");
    container.replaceChildren();

    if (!state.reviews.length) {
        container.appendChild(el("p", { className: "muted", textContent: "No reviews yet." }));
        return;
    }

    state.reviews.forEach((review) => {
        const liked = state.likedReviewIds.has(review.review_id);
        const card = el("article", { className: "card" }, [
            el("h3", { textContent: hotelName(review.hotel_id) }),
            el("p", { textContent: review.content }),
            el("div", { className: "meta" }, [
                el("span", { className: "pill", textContent: `${review.rating}/5 rating` }),
                el("span", { className: "pill", textContent: `by ${memberName(review.member_id)}` }),
                el("span", { className: "pill", textContent: `Review #${review.review_id}` }),
            ]),
        ]);

        if (state.sessionMember) {
            card.appendChild(
                el("button", {
                    type: "button",
                    className: liked ? "secondary" : "",
                    "data-toggle-like": String(review.review_id),
                    textContent: liked ? "Unlike" : "Like",
                })
            );
        }

        container.appendChild(card);
    });
}

async function submitJson(form, path, transform = (value) => value) {
    const payload = transform(formData(form));
    await api(path, { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    await loadAll();
}

function wireForms() {
    $("loginForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
        runAction(async () => {
            const data = formData(event.currentTarget);
            const member = await api("/members/login", {
                method: "POST",
                body: JSON.stringify({
                    username: data.username,
                    password: data.password,
                }),
            });
            state.sessionMember = member;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(member));
            event.currentTarget.reset();
            await loadAll();
            toast(`Welcome back, ${member.username}`);
        }, null, button);
    });

    $("memberForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
        runAction(async () => {
            const guestId = Number(formData(event.currentTarget).guest_id);
            if (!guestId) {
                throw new Error("Book a stay first, then link a member account to that guest profile");
            }
            const data = formData(event.currentTarget);
            const member = await api("/members", {
                method: "POST",
                body: JSON.stringify({
                    guest_id: guestId,
                    username: data.username,
                    password: data.password,
                }),
            });
            state.sessionMember = member;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(member));
            event.currentTarget.reset();
            await loadAll();
        }, "Member account created", button);
    });

    $("reservationForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
        runAction(async () => {
            const data = formData(event.currentTarget);
            const nights = calculateNights(data.arrival_date, data.departure_date);
            if (nights === null) {
                throw new Error("Departure must be after arrival");
            }
            if (Number(data.number_of_nights) !== nights) {
                throw new Error(`Number of nights must be ${nights} for the selected dates`);
            }

            const result = await api("/reservations", {
                method: "POST",
                body: JSON.stringify({
                    first_name: data.first_name,
                    last_name: data.last_name,
                    date_of_birth: data.date_of_birth,
                    email: data.email,
                    phone: data.phone,
                    hotel_id: Number(data.hotel_id),
                    room_number: Number(data.room_number),
                    arrival_date: data.arrival_date,
                    departure_date: data.departure_date,
                    number_of_nights: nights,
                }),
            });

            const note = $("returningGuestNote");
            if (result.guest_reused) {
                note.textContent = "We matched your email to an existing guest profile.";
                note.classList.remove("hidden");
            } else {
                note.textContent = "";
                note.classList.add("hidden");
            }

            event.currentTarget.reset();
            $("numberOfNights").value = "";
            await loadAll();
        }, "Reservation booked", button);
    });

    $("reviewForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
        runAction(async () => {
            const memberId = state.sessionMember?.member_id;
            if (!memberId) throw new Error("Sign in to post a review");
            await submitJson(event.currentTarget, "/reviews", (data) => ({
                ...data,
                member_id: memberId,
                hotel_id: Number(data.hotel_id),
                rating: Number(data.rating),
            }));
        }, "Review posted", button);
    });

    $("arrivalDate").addEventListener("change", updateNightsFromDates);
    $("departureDate").addEventListener("change", updateNightsFromDates);
}

function wireActions() {
    $("refreshBtn").addEventListener("click", (event) => {
        runAction(() => loadAll(), "Data refreshed", event.currentTarget);
    });

    document.body.addEventListener("click", (event) => {
        const reservationId = event.target.dataset.cancelReservation;
        const reviewId = event.target.dataset.toggleLike;

        if (reservationId) {
            runAction(async () => {
                const result = await api(`/reservations/${reservationId}`, { method: "DELETE" });
                if (result === false) throw new Error("Could not cancel reservation");
                await loadAll();
            }, "Reservation cancelled", event.target);
        }

        if (reviewId) {
            runAction(async () => {
                const memberId = state.sessionMember?.member_id;
                if (!memberId) throw new Error("Sign in to like reviews");

                if (state.likedReviewIds.has(Number(reviewId))) {
                    const result = await api(`/members/${memberId}/review_likes/${reviewId}`, { method: "DELETE" });
                    if (result === false) throw new Error("Could not unlike review");
                } else {
                    const result = await api(`/members/${memberId}/review_likes`, {
                        method: "POST",
                        body: JSON.stringify({ review_id: Number(reviewId) }),
                    });
                    if (result === false) throw new Error("Could not like review");
                }

                await loadLikedReviews();
                renderReviews();
            }, state.likedReviewIds.has(Number(reviewId)) ? "Review unliked" : "Review liked", event.target);
        }
    });
}

state.sessionMember = getSessionMember();
wireForms();
wireActions();
loadAll().catch((error) => toast(error.message));
