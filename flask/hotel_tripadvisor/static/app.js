const state = {
    guests: [],
    members: [],
    hotels: [],
    reservations: [],
    reviews: [],
    likedReviewIds: new Set(),
};

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
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
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
}

async function runAction(action, successMessage) {
    try {
        await action();
        if (successMessage) toast(successMessage);
    } catch (error) {
        toast(error.message || "Something went wrong");
    }
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

function guestsWithReservations() {
    const guestIds = new Set(state.reservations.map((reservation) => reservation.guest_id));
    return state.guests.filter((guest) => guestIds.has(guest.guest_id));
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
    const bookingGuests = guestsWithReservations();
    setOptions(
        $("memberGuestSelect"),
        bookingGuests,
        "guest_id",
        (guest) => `${guest.first_name} ${guest.last_name} (${guest.email})`,
        "Book a stay first",
    );
    setOptions(
        $("activeMember"),
        state.members,
        "member_id",
        (member) => `${member.username} (${guestName(member.guest_id)})`,
        "No members yet",
    );
    setOptions($("reservationHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
    setOptions($("reviewHotelSelect"), state.hotels, "hotel_id", (hotel) => hotel.name, "No hotels yet");
}

function renderHotels() {
    $("hotels").innerHTML = state.hotels.map((hotel) => `
        <article class="card">
            <h3>${escapeHtml(hotel.name)}</h3>
            <p class="muted">${escapeHtml(hotel.address)}</p>
            <div class="meta">
                <span class="pill">${escapeHtml(hotel.star_rating ?? "N/A")} stars</span>
                <span class="pill">${escapeHtml(hotel.number_of_rooms ?? 0)} rooms</span>
            </div>
        </article>
    `).join("") || `<p class="muted">No hotels are listed yet.</p>`;
}

function renderReservations() {
    $("reservations").innerHTML = state.reservations.map((reservation) => `
        <article class="card">
            <h3>${escapeHtml(hotelName(reservation.hotel_id))}</h3>
            <p><strong>${escapeHtml(guestName(reservation.guest_id))}</strong>, room ${escapeHtml(reservation.room_number)}</p>
            <p class="muted">${escapeHtml(dateOnly(reservation.arrival_date))} to ${escapeHtml(dateOnly(reservation.departure_date))}</p>
            <div class="meta">
                <span class="pill">${escapeHtml(reservation.number_of_nights)} nights</span>
                <span class="pill">Reservation #${escapeHtml(reservation.reservation_id)}</span>
            </div>
            <button class="secondary" type="button" data-cancel-reservation="${escapeHtml(reservation.reservation_id)}">Cancel</button>
        </article>
    `).join("") || `<p class="muted">No reservations yet.</p>`;
}

function renderReviews() {
    $("reviews").innerHTML = state.reviews.map((review) => {
        const liked = state.likedReviewIds.has(review.review_id);
        return `
            <article class="card">
                <h3>${escapeHtml(hotelName(review.hotel_id))}</h3>
                <p>${escapeHtml(review.content)}</p>
                <div class="meta">
                    <span class="pill">${escapeHtml(review.rating)}/5 rating</span>
                    <span class="pill">by ${escapeHtml(memberName(review.member_id))}</span>
                    <span class="pill">Review #${escapeHtml(review.review_id)}</span>
                </div>
                <button type="button" data-toggle-like="${escapeHtml(review.review_id)}" class="${liked ? "secondary" : ""}">
                    ${liked ? "Unlike" : "Like"}
                </button>
            </article>
        `;
    }).join("") || `<p class="muted">No reviews yet.</p>`;
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

async function submitJson(form, path, transform = (value) => value) {
    const payload = transform(formData(form));
    await api(path, { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    await loadAll();
}

function wireForms() {
    $("memberForm").addEventListener("submit", (event) => {
        event.preventDefault();
        runAction(async () => {
            const guestId = Number(formData(event.currentTarget).guest_id);
            if (!guestId) throw new Error("Book a stay first, then link a member account to that guest profile");
            await submitJson(event.currentTarget, "/members", (data) => ({
                guest_id: guestId,
                username: data.username,
                password: data.password,
            }));
        }, "Member account created");
    });

    $("reservationForm").addEventListener("submit", (event) => {
        event.preventDefault();
        runAction(async () => {
            const data = formData(event.currentTarget);
            await api("/reservations", {
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
                    number_of_nights: Number(data.number_of_nights),
                }),
            });
            event.currentTarget.reset();
            await loadAll();
        }, "Reservation booked");
    });

    $("reviewForm").addEventListener("submit", (event) => {
        event.preventDefault();
        runAction(async () => {
            const memberId = activeMemberId();
            if (!memberId) throw new Error("Create or select a member account first");
            await submitJson(event.currentTarget, "/reviews", (data) => ({
                ...data,
                member_id: memberId,
                hotel_id: Number(data.hotel_id),
                rating: Number(data.rating),
            }));
        }, "Review posted");
    });
}

function wireActions() {
    $("refreshBtn").addEventListener("click", () => runAction(() => loadAll(), "Data refreshed"));
    $("activeMember").addEventListener("change", () => runAction(async () => {
        await loadLikedReviews();
        renderReviews();
    }));

    document.body.addEventListener("click", (event) => {
        const reservationId = event.target.dataset.cancelReservation;
        const reviewId = event.target.dataset.toggleLike;

        if (reservationId) {
            runAction(async () => {
                const result = await api(`/reservations/${reservationId}`, { method: "DELETE" });
                if (result === false) throw new Error("Could not cancel reservation");
                await loadAll();
            }, "Reservation cancelled");
        }

        if (reviewId) {
            runAction(async () => {
                const memberId = activeMemberId();
                if (!memberId) throw new Error("Create or select a member account first");

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
            }, state.likedReviewIds.has(Number(reviewId)) ? "Review unliked" : "Review liked");
        }
    });
}

wireForms();
wireActions();
loadAll().catch((error) => toast(error.message));
