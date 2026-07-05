const state = {
    guests: [],
    members: [],
    hotels: [],
    reservations: [],
    reviews: [],
    likedReviewIds: new Set(),
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!response.ok) {
        throw new Error(`${options.method || "GET"} ${path} failed with ${response.status}`);
    }
    return response.json();
}

function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
}

function activeGuestId() {
    return Number($("activeGuest").value || state.guests[0]?.guest_id || 0);
}

function activeMemberId() {
    return Number($("activeMember").value || state.members[0]?.member_id || 0);
}

function guestName(id) {
    const guest = state.guests.find((item) => item.guest_id === Number(id));
    return guest ? `${guest.first_name} ${guest.last_name}` : `Guest #${id}`;
}

function memberName(id) {
    const member = state.members.find((item) => item.member_id === Number(id));
    return member ? member.username : `Member #${id}`;
}

function hotelName(id) {
    const hotel = state.hotels.find((item) => item.hotel_id === Number(id));
    return hotel ? hotel.name : `Hotel #${id}`;
}

function setOptions(select, items, valueKey, labelFn, placeholder) {
    const current = select.value;
    select.innerHTML = "";
    if (!items.length && placeholder) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = placeholder;
        select.append(option);
        return;
    }
    items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item[valueKey];
        option.textContent = labelFn(item);
        select.append(option);
    });
    if (items.some((item) => String(item[valueKey]) === current)) {
        select.value = current;
    }
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
    await loadLikedReviews();
    render();
}

async function loadLikedReviews() {
    state.likedReviewIds = new Set();
    const memberId = activeMemberId();
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
    renderHotels();
    renderReservations();
    renderReviews();
}

function renderSelects() {
    setOptions($("memberGuestSelect"), state.guests, "guest_id", (guest) => `${guest.first_name} ${guest.last_name}`, "Create a guest first");
    setOptions($("activeGuest"), state.guests, "guest_id", (guest) => `${guest.first_name} ${guest.last_name}`, "No guests yet");
    setOptions($("activeMember"), state.members, "member_id", (member) => `${member.username} (${guestName(member.guest_id)})`, "No members yet");
    setOptions($("reservationHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
    setOptions($("reviewHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
}

function renderHotels() {
    $("hotels").innerHTML = state.hotels.map((hotel) => `
        <article class="card">
            <h3>${hotel.name}</h3>
            <p class="muted">${hotel.address}</p>
            <div class="meta">
                <span class="pill">${hotel.star_rating || "N/A"} stars</span>
                <span class="pill">${hotel.number_of_rooms || 0} rooms</span>
            </div>
        </article>
    `).join("") || `<p class="muted">No hotels yet. Add one to get started.</p>`;
}

function renderReservations() {
    $("reservations").innerHTML = state.reservations.map((reservation) => `
        <article class="card">
            <h3>${hotelName(reservation.hotel_id)}</h3>
            <p><strong>${guestName(reservation.guest_id)}</strong>, room ${reservation.room_number}</p>
            <p class="muted">${dateOnly(reservation.arrival_date)} to ${dateOnly(reservation.departure_date)}</p>
            <div class="meta">
                <span class="pill">${reservation.number_of_nights} nights</span>
                <span class="pill">Reservation #${reservation.reservation_id}</span>
            </div>
            <button class="secondary" type="button" data-cancel-reservation="${reservation.reservation_id}">Cancel</button>
        </article>
    `).join("") || `<p class="muted">No reservations yet.</p>`;
}

function renderReviews() {
    $("reviews").innerHTML = state.reviews.map((review) => {
        const liked = state.likedReviewIds.has(review.review_id);
        return `
            <article class="card">
                <h3>${hotelName(review.hotel_id)}</h3>
                <p>${review.content}</p>
                <div class="meta">
                    <span class="pill">${review.rating}/5 rating</span>
                    <span class="pill">by ${memberName(review.member_id)}</span>
                    <span class="pill">Review #${review.review_id}</span>
                </div>
                <button type="button" data-toggle-like="${review.review_id}" class="${liked ? "secondary" : ""}">
                    ${liked ? "Unlike" : "Like"}
                </button>
            </article>
        `;
    }).join("") || `<p class="muted">No reviews yet.</p>`;
}

function dateOnly(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function submitJson(form, path, transform = (value) => value) {
    const payload = transform(formData(form));
    await api(path, { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    await loadAll();
}

function wireForms() {
    $("guestForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitJson(event.currentTarget, "/guests");
        toast("Guest created");
    });

    $("memberForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitJson(event.currentTarget, "/members", (data) => ({ ...data, guest_id: Number(data.guest_id) }));
        toast("Member created");
    });

    $("hotelForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitJson(event.currentTarget, "/hotels", (data) => ({
            ...data,
            star_rating: Number(data.star_rating),
            number_of_rooms: Number(data.number_of_rooms),
        }));
        toast("Hotel added");
    });

    $("reservationForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const guestId = activeGuestId();
        if (!guestId) return toast("Create or select a guest first");
        await submitJson(event.currentTarget, "/reservations", (data) => ({
            ...data,
            guest_id: guestId,
            hotel_id: Number(data.hotel_id),
            room_number: Number(data.room_number),
            number_of_nights: Number(data.number_of_nights),
        }));
        toast("Reservation booked");
    });

    $("reviewForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const memberId = activeMemberId();
        if (!memberId) return toast("Create or select a member first");
        await submitJson(event.currentTarget, "/reviews", (data) => ({
            ...data,
            member_id: memberId,
            hotel_id: Number(data.hotel_id),
            rating: Number(data.rating),
        }));
        toast("Review posted");
    });
}

function wireActions() {
    $("refreshBtn").addEventListener("click", () => loadAll().then(() => toast("Data refreshed")));
    $("activeMember").addEventListener("change", () => loadLikedReviews().then(renderReviews));

    document.body.addEventListener("click", async (event) => {
        const reservationId = event.target.dataset.cancelReservation;
        const reviewId = event.target.dataset.toggleLike;

        if (reservationId) {
            await api(`/reservations/${reservationId}`, { method: "DELETE" });
            await loadAll();
            toast("Reservation cancelled");
        }

        if (reviewId) {
            const memberId = activeMemberId();
            if (!memberId) return toast("Create or select a member first");
            if (state.likedReviewIds.has(Number(reviewId))) {
                await api(`/members/${memberId}/review_likes/${reviewId}`, { method: "DELETE" });
                toast("Review unliked");
            } else {
                await api(`/members/${memberId}/review_likes`, {
                    method: "POST",
                    body: JSON.stringify({ review_id: Number(reviewId) }),
                });
                toast("Review liked");
            }
            await loadLikedReviews();
            renderReviews();
        }
    });
}

wireForms();
wireActions();
loadAll().catch((error) => toast(error.message));
