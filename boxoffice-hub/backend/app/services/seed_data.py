import json
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.config.review_channels import REVIEW_CHANNELS
from app.models import AdvanceBooking, DailyBreakdown, DailySummary, Movie, YoutubeReview

CRORE = 10_000_000.0

ALL_34_STATES = [
    ("Andhra Pradesh", 0.195),
    ("Telangana", 0.185),
    ("Maharashtra", 0.145),
    ("Delhi NCR", 0.085),
    ("Karnataka", 0.082),
    ("Tamil Nadu", 0.068),
    ("Uttar Pradesh", 0.048),
    ("Gujarat", 0.036),
    ("West Bengal", 0.032),
    ("Rajasthan", 0.025),
    ("Kerala", 0.021),
    ("Madhya Pradesh", 0.016),
    ("Bihar", 0.012),
    ("Punjab", 0.011),
    ("Haryana", 0.009),
    ("Odisha", 0.008),
    ("Jharkhand", 0.005),
    ("Assam", 0.0045),
    ("Chhattisgarh", 0.004),
    ("Uttarakhand", 0.003),
    ("Chandigarh", 0.0022),
    ("Jammu & Kashmir", 0.0014),
    ("Goa", 0.0011),
    ("Himachal Pradesh", 0.0008),
    ("Puducherry", 0.0006),
    ("Tripura", 0.0003),
    ("Manipur", 0.0002),
    ("Meghalaya", 0.0002),
    ("Nagaland", 0.00015),
    ("Sikkim", 0.00012),
    ("Arunachal Pradesh", 0.0001),
    ("Mizoram", 0.00008),
    ("Andaman & Nicobar", 0.00008),
    ("Ladakh", 0.00007),
]

TOP_CITIES = [
    ("Hyderabad", 0.215),
    ("Mumbai", 0.145),
    ("Delhi NCR", 0.125),
    ("Bengaluru", 0.095),
    ("Chennai", 0.072),
    ("Pune", 0.048),
    ("Visakhapatnam", 0.042),
    ("Vijayawada", 0.038),
    ("Kolkata", 0.036),
    ("Ahmedabad", 0.032),
    ("Guntur", 0.029),
    ("Warangal", 0.026),
    ("Jaipur", 0.025),
    ("Lucknow", 0.024),
    ("Rajahmundry", 0.022),
    ("Kochi", 0.018),
    ("Tirupati", 0.016),
    ("Surat", 0.014),
    ("Nagpur", 0.013),
    ("Indore", 0.011),
]

AP_TG_AREAS = [
    ("Nizam (Telangana)", 0.365),
    ("Ceeded (Rayalaseema)", 0.165),
    ("Uttarandhra (Vizag)", 0.135),
    ("Guntur", 0.095),
    ("East Godavari", 0.082),
    ("Krishna", 0.070),
    ("West Godavari", 0.052),
    ("Nellore", 0.036),
]

TIME_SLOTS = [
    ("Morning (6 AM - 12 PM)", 0.165, 0.88),
    ("Afternoon (12 PM - 3 PM)", 0.205, 0.94),
    ("Evening (3 PM - 6 PM)", 0.245, 1.02),
    ("Night (6 PM - 9 PM)", 0.275, 1.12),
    ("Late Night (9 PM+)", 0.110, 1.06),
]

FORMATS = [
    ("2D", 0.615, 0.92),
    ("3D", 0.225, 1.15),
    ("IMAX 2D/3D", 0.105, 1.75),
    ("4DX / ICE", 0.055, 1.62),
]


def build_breakdowns_for_day(
    movie_id: int,
    day_number: int,
    gross_inr: float,
    tickets_sold: int,
    shows: int,
    atp_inr: float,
    occupancy_pct: float,
    fast_filling: int,
    housefull: int,
    lang_weights: list[tuple[str, float]],
) -> list[DailyBreakdown]:
    rows: list[DailyBreakdown] = []

    # 1. Time slots
    for idx, (name, share, atp_mult) in enumerate(TIME_SLOTS):
        slot_gross = round(gross_inr * share, 2)
        slot_atp = round(atp_inr * atp_mult, 2)
        slot_shows = max(1, round(shows * (0.18 if idx == 0 else 0.22 if idx < 4 else 0.16)))
        slot_tickets = max(1, int(slot_gross / max(slot_atp, 1.0)))
        slot_occ = round(min(99.0, max(12.0, occupancy_pct * (0.88 + idx * 0.05))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="time_slot",
                dimension_name=name,
                gross_inr=slot_gross,
                share_pct=round(share * 100, 1),
                tickets_sold=slot_tickets,
                atp_inr=slot_atp,
                shows=slot_shows,
                occupancy_pct=slot_occ,
                fast_filling=max(0, round(fast_filling * share)),
                housefull=max(0, round(housefull * share)),
            )
        )

    # 2. Top cities (normalized share against total city pool)
    city_total_weight = sum(w for _, w in TOP_CITIES)
    for idx, (name, weight) in enumerate(TOP_CITIES):
        norm_share = weight / city_total_weight * 0.78  # top 20 cities represent ~78% of India gross
        c_gross = round(gross_inr * norm_share, 2)
        c_atp = round(atp_inr * (1.28 if idx in (1, 2, 3) else 0.92 if idx > 10 else 1.05), 2)
        c_shows = max(1, round(shows * (weight / city_total_weight) * 0.68))
        c_tickets = max(1, int(c_gross / max(c_atp, 1.0)))
        c_occ = round(min(99.0, max(18.0, occupancy_pct * (1.08 - idx * 0.012))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="city",
                dimension_name=name,
                gross_inr=c_gross,
                share_pct=round(norm_share * 100, 1),
                tickets_sold=c_tickets,
                atp_inr=c_atp,
                shows=c_shows,
                occupancy_pct=c_occ,
                fast_filling=max(0, round(fast_filling * (weight / city_total_weight) * 0.75)),
                housefull=max(0, round(housefull * (weight / city_total_weight) * 0.80)),
            )
        )

    # 3. All 34 States & UTs
    state_total_w = sum(w for _, w in ALL_34_STATES)
    for idx, (name, weight) in enumerate(ALL_34_STATES):
        share = weight / state_total_w
        s_gross = round(gross_inr * share, 2)
        s_atp = round(atp_inr * (1.18 if idx in (2, 3, 4) else 0.88 if idx > 12 else 1.0), 2)
        s_shows = max(1, round(shows * share))
        s_tickets = max(1, int(s_gross / max(s_atp, 1.0)))
        s_occ = round(min(99.0, max(14.0, occupancy_pct * (1.06 - idx * 0.015))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="state",
                dimension_name=name,
                gross_inr=s_gross,
                share_pct=round(share * 100, 2),
                tickets_sold=s_tickets,
                atp_inr=s_atp,
                shows=s_shows,
                occupancy_pct=s_occ,
                fast_filling=max(0, round(fast_filling * share)),
                housefull=max(0, round(housefull * share)),
            )
        )

    # 4. AP/TG Area-wise (roughly ~38% of India gross)
    aptg_pool = gross_inr * 0.38
    aptg_shows_pool = max(8, round(shows * 0.36))
    for idx, (name, share) in enumerate(AP_TG_AREAS):
        a_gross = round(aptg_pool * share, 2)
        a_atp = round(atp_inr * (1.04 if idx == 0 else 0.90), 2)
        a_shows = max(1, round(aptg_shows_pool * share))
        a_tickets = max(1, int(a_gross / max(a_atp, 1.0)))
        a_occ = round(min(99.0, max(20.0, occupancy_pct * (1.10 - idx * 0.02))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="area",
                dimension_name=name,
                gross_inr=a_gross,
                share_pct=round(share * 100, 1),
                tickets_sold=a_tickets,
                atp_inr=a_atp,
                shows=a_shows,
                occupancy_pct=a_occ,
                fast_filling=max(0, round(fast_filling * 0.42 * share)),
                housefull=max(0, round(housefull * 0.45 * share)),
            )
        )

    # 5. Language-wise
    for idx, (lang_name, share) in enumerate(lang_weights):
        l_gross = round(gross_inr * share, 2)
        l_atp = round(atp_inr * (1.08 if lang_name == "Hindi" else 0.96), 2)
        l_shows = max(1, round(shows * share))
        l_tickets = max(1, int(l_gross / max(l_atp, 1.0)))
        l_occ = round(min(99.0, max(18.0, occupancy_pct * (1.04 - idx * 0.04))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="language",
                dimension_name=lang_name,
                gross_inr=l_gross,
                share_pct=round(share * 100, 1),
                tickets_sold=l_tickets,
                atp_inr=l_atp,
                shows=l_shows,
                occupancy_pct=l_occ,
                fast_filling=max(0, round(fast_filling * share)),
                housefull=max(0, round(housefull * share)),
            )
        )

    # 6. Format-wise
    for idx, (fmt_name, share, atp_mult) in enumerate(FORMATS):
        f_gross = round(gross_inr * share, 2)
        f_atp = round(atp_inr * atp_mult, 2)
        f_shows = max(1, round(shows * (0.70 if idx == 0 else 0.18 if idx == 1 else 0.07 if idx == 2 else 0.05)))
        f_tickets = max(1, int(f_gross / max(f_atp, 1.0)))
        f_occ = round(min(99.0, max(20.0, occupancy_pct * (0.98 + idx * 0.04))), 1)
        rows.append(
            DailyBreakdown(
                movie_id=movie_id,
                day_number=day_number,
                breakdown_type="format",
                dimension_name=fmt_name,
                gross_inr=f_gross,
                share_pct=round(share * 100, 1),
                tickets_sold=f_tickets,
                atp_inr=f_atp,
                shows=f_shows,
                occupancy_pct=f_occ,
                fast_filling=max(0, round(fast_filling * share)),
                housefull=max(0, round(housefull * share)),
            )
        )

    return rows


def seed_database(db: Session) -> None:
    if db.query(Movie).count() > 0:
        return

    now = datetime.now(timezone.utc)

    movies_spec = [
        {
            "slug": "pushpa-2-the-rule",
            "title": "Pushpa 2: The Rule",
            "release_date": date(2024, 12, 5),
            "director": "Sukumar",
            "cast": ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil", "Jagapathi Babu"],
            "genres": ["Action", "Drama", "Thriller"],
            "languages": ["Telugu", "Hindi", "Tamil", "Malayalam", "Kannada"],
            "poster_url": "https://image.tmdb.org/t/p/w500/bGLG3rrpOWffo0pz5AkG0K7Vhfe.jpg",
            "trailer_video_id": "g3JUbgOHgdw",
            "trailer_meta": {
                "title": "Pushpa 2: The Rule Official Trailer | Allu Arjun | Sukumar | Rashmika Mandanna | DSP",
                "channel_name": "Mythri Movie Makers",
                "thumbnail_url": "https://i.ytimg.com/vi/g3JUbgOHgdw/maxresdefault.jpg",
                "duration": "2:48",
                "fetched_at": now.isoformat(),
            },
            "status": "COMPLETED",
            # Day 0 (Premiere) + Days 1..21
            "days": [
                (0, "Premiere", 12.65, 295.0, 2150, 740, 185, 92.4, False),
                (1, "Day 1", 175.20, 298.0, 16240, 3820, 482, 94.8, False),
                (2, "Day 2", 94.60, 286.0, 15980, 3790, 476, 78.2, False),
                (3, "Day 3", 119.50, 292.0, 16120, 3810, 480, 86.5, False),
                (4, "Day 4", 141.30, 296.0, 16350, 3840, 485, 91.2, False),
                (5, "Day 5", 64.40, 268.0, 15420, 3710, 465, 61.4, False),
                (6, "Day 6", 51.80, 262.0, 15110, 3660, 458, 54.2, False),
                (7, "Day 7", 43.20, 258.0, 14850, 3590, 450, 49.6, False),
                (8, "Day 8", 36.80, 252.0, 13420, 3310, 420, 44.5, False),
                (9, "Day 9", 36.40, 254.0, 13280, 3290, 418, 45.2, False),
                (10, "Day 10", 63.30, 272.0, 13960, 3420, 436, 67.8, False),
                (11, "Day 11", 76.60, 278.0, 14210, 3480, 442, 74.1, False),
                (12, "Day 12", 26.95, 245.0, 12650, 3150, 402, 39.4, False),
                (13, "Day 13", 23.35, 242.0, 12340, 3090, 396, 36.8, False),
                (14, "Day 14", 20.55, 240.0, 12120, 3040, 390, 34.2, False),
                (15, "Day 15", 17.65, 238.0, 11420, 2890, 374, 31.5, False),
                (16, "Day 16", 14.30, 235.0, 10860, 2740, 362, 28.9, False),
                (17, "Day 17", 24.75, 256.0, 11280, 2850, 370, 46.2, False),
                (18, "Day 18", 32.95, 264.0, 11540, 2910, 378, 55.4, False),
                (19, "Day 19", 13.05, 232.0, 9840, 2520, 340, 27.6, False),
                (20, "Day 20", 14.50, 236.0, 9620, 2480, 336, 30.8, False),
                (21, "Day 21", 19.75, 248.0, 9910, 2540, 342, 38.4, False),
            ],
            "lang_weights": [
                ("Hindi", 0.56),
                ("Telugu", 0.31),
                ("Tamil", 0.065),
                ("Malayalam", 0.035),
                ("Kannada", 0.030),
            ],
            "advance": [
                (date(2024, 12, 5), 118.40 * CRORE, 3975000, 15900, 3800, 480, 86.5, 4210, 6180),
            ],
            "sentiments": [
                "Positive", "Positive", "Mixed", "Positive", "Positive",
                "Positive", "Mixed", "Positive", "Positive", "Negative",
            ],
            "review_videos": [
                ("g3JUbgOHgdw", "Pushpa 2 The Rule Movie Review | Wildest Mass Entertainer of 2024!", 1840000, "14:22"),
                ("v7H4k2dM1xQ", "Pushpa 2 Review — Allu Arjun Unstoppable, Sukumar Delivers Pure Mania", 1320000, "11:48"),
                ("k9R2m8pN4wA", "Pushpa 2 Breakdown & Honest Review: Genius or Overstuffed?", 980000, "18:05"),
                ("p4L9x3sT7zC", "Pushpa 2 The Rule Public & Critics Review — Theatre Reactions!", 760000, "12:15"),
                ("m2N6v1bR8yE", "Pushpa 2 Movie Review by Yogi Bolta Hai | Paisa Vasool?", 1140000, "09:54"),
                ("q8W5z2cF6nK", "Pushpa 2 Spoiler-Free Review & Hidden Symbolism Explained", 690000, "16:30"),
                ("r3T7y9hJ1mP", "Pushpa 2 Pitch Meeting — Wait, He Survived That Too?!", 540000, "08:12"),
                ("s6B1n4kV9wD", "Pushpa 2: The Rule Detailed Review | Allu Arjun Career Best | Thyview", 1490000, "15:40"),
                ("t5D8g2jL3qZ", "Pushpa 2 Genuine Review | Ragadi | Mass Euphoria & Second Half Analysis", 620000, "13:18"),
                ("u1F3h6mN8xR", "Pushpa 2 Honest Telugu Review | Poola Chokka", 410000, "11:04"),
            ],
        },
        {
            "slug": "daaku-maharaaj",
            "title": "Daaku Maharaaj",
            "release_date": date(2025, 1, 12),
            "director": "Bobby Kolli",
            "cast": ["Nandamuri Balakrishna", "Bobby Deol", "Pragya Jaiswal", "Shraddha Srinath"],
            "genres": ["Action", "Drama"],
            "languages": ["Telugu", "Hindi"],
            "poster_url": "https://image.tmdb.org/t/p/w500/wA64z4M26f390lN9M4bN03tV3gE.jpg",
            "trailer_video_id": "fNDRSver0uM",
            "trailer_meta": {
                "title": "Daaku Maharaaj Theatrical Trailer | Nandamuri Balakrishna | Bobby Kolli | Thaman S",
                "channel_name": "Sithara Entertainments",
                "thumbnail_url": "https://i.ytimg.com/vi/fNDRSver0uM/maxresdefault.jpg",
                "duration": "2:34",
                "fetched_at": now.isoformat(),
            },
            "status": "RUNNING",
            "days": [
                (1, "Day 1", 34.80, 255.0, 5840, 1480, 195, 84.6, False),
                (2, "Day 2", 18.45, 240.0, 5620, 1450, 190, 58.2, False),
                (3, "Day 3", 14.90, 235.0, 5490, 1420, 188, 52.4, False),
                (4, "Day 4", 21.60, 245.0, 5580, 1440, 190, 66.8, False),
                (5, "Day 5", 13.20, 230.0, 5210, 1360, 182, 46.5, False),
                (6, "Day 6", 9.85, 225.0, 4950, 1310, 178, 39.1, False),
                (7, "Day 7", 11.40, 232.0, 5080, 1330, 180, 44.8, True),
            ],
            "lang_weights": [
                ("Telugu", 0.86),
                ("Hindi", 0.14),
            ],
            "advance": [
                (date(2025, 1, 19), 6.85 * CRORE, 295000, 4820, 1290, 176, 38.4, 710, 490),
                (date(2025, 1, 20), 2.40 * CRORE, 108000, 4410, 1180, 165, 19.2, 240, 115),
            ],
            "sentiments": [
                "Mixed", "Positive", "Mixed", "Positive", "Mixed",
                "Neutral", "Negative", "Positive", "Positive", "Mixed",
            ],
            "review_videos": [
                ("fNDRSver0uM", "Daaku Maharaaj Movie Review | Thaman BGM & Balakrishna Swag", 480000, "11:20"),
                ("a2C4e6gI8kM", "Daaku Maharaaj Hindi Dubbed Review — Mass Sankranthi Treat?", 390000, "09:42"),
                ("b3D5f7hJ9lN", "Daaku Maharaaj Review: Stylized Action Meets Classic Formula", 310000, "13:15"),
                ("c4E6g8iK0mO", "Daaku Maharaaj Honest Review | Worth Theatre Watch?", 275000, "10:08"),
                ("d5F7h9jL1nP", "Daaku Maharaaj Review by Yogi Bolta Hai", 420000, "08:50"),
                ("e6G8i0kM2oQ", "Daaku Maharaaj Cinematography & Action Breakdown", 215000, "12:35"),
                ("g7H9j1lN3pR", "Daaku Maharaaj Pitch Meeting Parody & Critique", 195000, "07:45"),
                ("h8I0k2mO4qS", "Daaku Maharaaj Detailed Review | Balayya + Bobby Kolli | Thyview", 890000, "14:52"),
                ("i9J1l3nP5rT", "Daaku Maharaaj Genuine Review | Ragadi | Sankranthi Winner?", 510000, "12:10"),
                ("j0K2m4oQ6sU", "Daaku Maharaaj Telugu Review | Poola Chokka", 360000, "10:28"),
            ],
        },
        {
            "slug": "game-changer",
            "title": "Game Changer",
            "release_date": date(2025, 1, 10),
            "director": "S. Shankar",
            "cast": ["Ram Charan", "Kiara Advani", "S. J. Suryah", "Anjali"],
            "genres": ["Action", "Political", "Drama"],
            "languages": ["Telugu", "Hindi", "Tamil"],
            "poster_url": "https://image.tmdb.org/t/p/w500/aaNngewrVUNykXwDLLSoBa59BcF.jpg",
            "trailer_video_id": "5lpfyGSQXbQ",
            "trailer_meta": {
                "title": "Game Changer Official Trailer | Ram Charan | Kiara Advani | Shankar | Thaman S",
                "channel_name": "Sri Venkateswara Creations",
                "thumbnail_url": "https://i.ytimg.com/vi/5lpfyGSQXbQ/maxresdefault.jpg",
                "duration": "2:40",
                "fetched_at": now.isoformat(),
            },
            "status": "COMPLETED",
            "days": [
                (1, "Day 1", 51.20, 262.0, 9450, 2410, 310, 76.4, False),
                (2, "Day 2", 21.60, 248.0, 9120, 2350, 305, 49.5, False),
                (3, "Day 3", 15.90, 242.0, 8840, 2290, 298, 41.2, False),
                (4, "Day 4", 10.10, 228.0, 8150, 2140, 285, 31.8, False),
                (5, "Day 5", 10.00, 226.0, 7920, 2090, 280, 31.2, False),
                (6, "Day 6", 6.80, 220.0, 7340, 1950, 265, 24.5, False),
                (7, "Day 7", 4.50, 215.0, 6810, 1820, 250, 19.8, False),
                (8, "Day 8", 2.90, 208.0, 5120, 1410, 210, 16.4, False),
                (9, "Day 9", 2.75, 210.0, 4980, 1380, 205, 16.1, False),
                (10, "Day 10", 3.15, 214.0, 5040, 1390, 208, 18.9, False),
                (11, "Day 11", 1.85, 202.0, 4210, 1180, 185, 12.6, False),
                (12, "Day 12", 1.40, 198.0, 3890, 1090, 175, 10.4, False),
                (13, "Day 13", 1.15, 195.0, 3520, 980, 160, 9.2, False),
                (14, "Day 14", 0.95, 192.0, 3180, 890, 148, 8.1, False),
            ],
            "lang_weights": [
                ("Telugu", 0.64),
                ("Hindi", 0.25),
                ("Tamil", 0.11),
            ],
            "advance": [],
            "sentiments": [
                "Mixed", "Negative", "Mixed", "Positive", "Mixed",
                "Negative", "Negative", "Mixed", "Positive", "Mixed",
            ],
            "review_videos": [
                ("5lpfyGSQXbQ", "Game Changer Review — Ram Charan Shines, But Where Is Old Shankar?", 940000, "15:12"),
                ("x1Y2z3A4b5C", "Game Changer Movie Review by Filmi Indian | Honest Take", 820000, "11:34"),
                ("y2Z3a4B5c6D", "Game Changer Breakdown: What Worked & What Didn't", 610000, "17:20"),
                ("z3A4b5C6d7E", "Game Changer Theatre Reaction & Review — S.J. Suryah Steals Show", 495000, "10:45"),
                ("w4B5c6D7e8F", "Game Changer Review by Yogi Bolta Hai", 710000, "09:18"),
                ("v5C6d7E8f9G", "Why Game Changer Struggled At The Box Office — Detailed Analysis", 530000, "14:02"),
                ("u6D7e8F9g0H", "Game Changer Pitch Meeting — 70 Crore For Two Songs?!", 460000, "08:40"),
                ("t7E8f9G0h1I", "Game Changer Detailed Review | Ram Charan Dual Role | Thyview", 1120000, "16:15"),
                ("s8F9g0H1i2J", "Game Changer Genuine Review | Ragadi | Shankar's Political Drama", 680000, "13:50"),
                ("r9G0h1I2j3K", "Game Changer Telugu Review | Poola Chokka", 430000, "11:12"),
            ],
        },
        {
            "slug": "kalki-2898-ad",
            "title": "Kalki 2898 AD",
            "release_date": date(2024, 6, 27),
            "director": "Nag Ashwin",
            "cast": ["Prabhas", "Amitabh Bachchan", "Kamal Haasan", "Deepika Padukone"],
            "genres": ["Sci-Fi", "Mythology", "Action"],
            "languages": ["Telugu", "Hindi", "Tamil", "Malayalam", "Kannada"],
            "poster_url": "https://image.tmdb.org/t/p/w500/rstcALK1L4J2wR3d5zS9w9Q0f2k.jpg",
            "trailer_video_id": "y1-w1kUGuz8",
            "trailer_meta": {
                "title": "Kalki 2898 AD Release Trailer | Prabhas | Amitabh Bachchan | Kamal Haasan | Nag Ashwin",
                "channel_name": "Vyjayanthi Network",
                "thumbnail_url": "https://i.ytimg.com/vi/y1-w1kUGuz8/maxresdefault.jpg",
                "duration": "2:22",
                "fetched_at": now.isoformat(),
            },
            "status": "COMPLETED",
            "days": [
                (1, "Day 1", 114.20, 292.0, 14850, 3540, 445, 91.5, False),
                (2, "Day 2", 68.50, 278.0, 14520, 3490, 440, 72.4, False),
                (3, "Day 3", 78.90, 285.0, 14710, 3520, 442, 81.2, False),
                (4, "Day 4", 104.30, 290.0, 14920, 3560, 448, 88.9, False),
                (5, "Day 5", 41.20, 254.0, 13840, 3360, 425, 53.6, False),
                (6, "Day 6", 33.40, 248.0, 13410, 3290, 418, 46.8, False),
                (7, "Day 7", 27.90, 244.0, 13120, 3210, 412, 41.2, False),
                (8, "Day 8", 24.60, 240.0, 11850, 2960, 385, 38.4, False),
                (9, "Day 9", 21.80, 242.0, 11640, 2910, 380, 36.9, False),
                (10, "Day 10", 42.40, 265.0, 12190, 3040, 395, 59.4, False),
                (11, "Day 11", 52.80, 272.0, 12450, 3100, 402, 68.2, False),
                (12, "Day 12", 14.90, 232.0, 10840, 2720, 360, 29.5, False),
                (13, "Day 13", 12.60, 228.0, 10410, 2640, 350, 26.8, False),
                (14, "Day 14", 11.20, 226.0, 10120, 2580, 344, 25.1, False),
            ],
            "lang_weights": [
                ("Telugu", 0.44),
                ("Hindi", 0.41),
                ("Tamil", 0.07),
                ("Malayalam", 0.045),
                ("Kannada", 0.035),
            ],
            "advance": [],
            "sentiments": [
                "Positive", "Positive", "Positive", "Positive", "Positive",
                "Positive", "Mixed", "Positive", "Positive", "Mixed",
            ],
            "review_videos": [
                ("y1-w1kUGuz8", "Kalki 2898 AD Review — A Landmark Moment for Indian Sci-Fi Cinema!", 1620000, "15:30"),
                ("k1A2b3C4d5E", "Kalki 2898 AD Review by Filmi Indian | Mahabharata Meets Dune", 1290000, "12:04"),
                ("l2B3c4D5e6F", "Kalki 2898 AD Easter Eggs, Lore & Ending Explained", 1410000, "21:18"),
                ("m3C4d5E6f7G", "Kalki 2898 AD Review — Amitabh Bachchan Is The Soul!", 880000, "11:45"),
                ("n4D5e6F7g8H", "Kalki 2898 AD Honest Review | Yogi Bolta Hai", 950000, "10:12"),
                ("o5E6f7G8h9I", "Kalki 2898 AD Comic-Con Lore & Sequel Theories", 1040000, "18:40"),
                ("p6F7g8H9i0J", "Kalki 2898 AD Pitch Meeting — Complex Is Actually Pretty Simple", 510000, "08:55"),
                ("q7G8h9I0j1K", "Kalki 2898 AD Detailed Analysis | Nag Ashwin Vision | Thyview", 1750000, "19:25"),
                ("r8H9i0J1k2L", "Kalki 2898 AD Review | Ragadi | Stunning Climax & Worldbuilding", 730000, "14:10"),
                ("s9I0j1K2l3M", "Kalki 2898 AD Telugu Review | Poola Chokka", 490000, "11:36"),
            ],
        },
    ]

    for spec in movies_spec:
        movie = Movie(
            slug=spec["slug"],
            title=spec["title"],
            release_date=spec["release_date"],
            director=spec["director"],
            cast_json=json.dumps(spec["cast"]),
            genres_json=json.dumps(spec["genres"]),
            languages_json=json.dumps(spec["languages"]),
            poster_url=spec["poster_url"],
            trailer_video_id=spec["trailer_video_id"],
            trailer_meta_json=json.dumps(spec["trailer_meta"]),
            status=spec["status"],
            last_updated_at=now,
        )
        db.add(movie)
        db.flush()

        for day_num, day_label, gross_cr, atp_inr, shows, theatres, cities, occ_pct, is_live in spec["days"]:
            gross_inr = round(gross_cr * CRORE, 2)
            tickets = max(1, int(gross_inr / atp_inr))
            day_dt = spec["release_date"] + timedelta(days=day_num - 1) if day_num >= 1 else spec["release_date"] - timedelta(days=1)
            housefull = max(0, int(shows * (occ_pct / 100.0) * 0.42))
            fast_filling = max(0, int(shows * (occ_pct / 100.0) * 0.28))
            pic_gross = round(gross_inr * 0.24, 2)  # National multiplex chains (~24% share)

            db.add(
                DailySummary(
                    movie_id=movie.id,
                    day_number=day_num,
                    day_label=day_label,
                    date=day_dt,
                    gross_inr=gross_inr,
                    tickets_sold=tickets,
                    atp_inr=atp_inr,
                    shows=shows,
                    theatres=theatres,
                    cities=cities,
                    occupancy_pct=occ_pct,
                    fast_filling=fast_filling,
                    housefull=housefull,
                    pic_gross_inr=pic_gross,
                    is_live=is_live,
                )
            )

            breakdown_rows = build_breakdowns_for_day(
                movie_id=movie.id,
                day_number=day_num,
                gross_inr=gross_inr,
                tickets_sold=tickets,
                shows=shows,
                atp_inr=atp_inr,
                occupancy_pct=occ_pct,
                fast_filling=fast_filling,
                housefull=housefull,
                lang_weights=spec["lang_weights"],
            )
            db.add_all(breakdown_rows)

        for target_dt, adv_gross, adv_tix, adv_shows, adv_theatres, adv_cities, adv_occ, adv_ff, adv_hf in spec["advance"]:
            db.add(
                AdvanceBooking(
                    movie_id=movie.id,
                    target_date=target_dt,
                    gross_inr=adv_gross,
                    tickets_sold=adv_tix,
                    shows=adv_shows,
                    theatres=adv_theatres,
                    cities=adv_cities,
                    occupancy_pct=adv_occ,
                    fast_filling=adv_ff,
                    housefull=adv_hf,
                    updated_at=now,
                )
            )

        for idx, ch in enumerate(REVIEW_CHANNELS):
            vid_id, vid_title, view_cnt, dur = spec["review_videos"][idx]
            sentiment = spec["sentiments"][idx]
            pub_dt = datetime.combine(spec["release_date"] + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=idx * 3)
            db.add(
                YoutubeReview(
                    movie_id=movie.id,
                    channel_name=ch["name"],
                    language=ch["language"],
                    video_id=vid_id,
                    title=vid_title,
                    thumbnail_url=f"https://i.ytimg.com/vi/{spec['trailer_video_id']}/hqdefault.jpg" if len(vid_id) != 11 else f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                    view_count=view_cnt,
                    published_at=pub_dt,
                    duration=dur,
                    sentiment_tag=sentiment,
                    fetched_at=now,
                )
            )

    db.commit()
