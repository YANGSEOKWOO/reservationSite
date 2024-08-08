const jq = $.noConflict();

// 특정 날짜에 해당하는 data 반환
const mockData = {
    "2024-08-07": [
        { id: 1, room: 1, start: "10:00", end: "12:00", team: "cloudTech" },
        { id: 2, room: 2, start: "14:00", end: "16:00", team: "payRoll" },
        { id: 3, room: 3, start: "09:00", end: "11:00", team: "marketing" },
    ],
    "2024-08-08": [
        { id: 4, room: 1, start: "11:00", end: "13:00", team: "devOps" },
        { id: 5, room: 2, start: "12:00", end: "14:00", team: "hr" },
        { id: 6, room: 3, start: "15:00", end: "17:00", team: "finance" },
    ],
};

// 팀 색상 매핑
const teamColors = {
    cloudTech: "#007bff",
    payRoll: "#28a745",
    marketing: "#dc3545",
    devOps: "#ffc107",
    hr: "#17a2b8",
    finance: "#6610f2",
};

const reserveModule = ((jq) => {
    let _pubFn = {};
    let reservationData;
    const DateTime = luxon.DateTime;
    const today = DateTime.now();
    const todayFormatted = today.toFormat("yyyy-MM-dd");

    let _searchDate = todayFormatted;

    const baseurl = "http://127.0.0.1:8000";

    const timeToInt = (time) => {
        const [hours, minutes] = time.split(":");
        return parseInt(hours) + parseInt(minutes) / 60;
    };

    /**
     * 예약정보를 가져오는 함수 (지금은 목업데이터)
     * @param {*} param0
     * @returns
     */
    const getReservationData = ({ date }) => {
        return new Promise((resolve, reject) => {
            jq("#loader").show();
            setTimeout(() => {
                resolve(mockData[date] || []);
                jq("#loader").hide();
            }, 1000);
        });
    };

    /**
     * 특정 날짜에 대한 예약정보를 화면으로 표시하는 함수
     *
     * @param {*} param0
     */
    const displayReservationData = ({ reservationData }) => {
        console.log("reservationData:", reservationData);
        let rows = "";
        const existingRooms = {};
        reservationData.forEach((data) => {
            if (!existingRooms[data.room]) {
                existingRooms[
                    data.room
                ] = `<tr data-room="${data.room}"><td><span>${data.room}</span></td>`;
                for (let i = 8; i <= 19; i++) {
                    existingRooms[data.room] += `<td></td>`;
                }
                existingRooms[data.room] += `</tr>`;
            }
        });

        jq(".reserve-items").html(Object.values(existingRooms).join(""));

        reservationData.forEach((data) => {
            const start = timeToInt(data.start);
            const end = timeToInt(data.end);
            const roomRow = jq(`tr[data-room='${data.room}'] td`);
            for (let i = 8; i <= 19; i++) {
                if (i >= start && i < end) {
                    roomRow
                        .eq(i - 7)
                        .addClass("reserved")
                        .css("background-color", teamColors[data.team])
                        .data({
                            id: data.id,
                            room: data.room,
                            start: data.start,
                            end: data.end,
                            team: data.team,
                        });
                }
            }
        });

        jq(".reserved").on("click", function () {
            const id = jq(this).data("id");
            const room = jq(this).data("room");
            const start = jq(this).data("start");
            const end = jq(this).data("end");
            const team = jq(this).data("team");
            console.log("id", id);
            console.log("room", room);
            console.log("start", start);
            console.log("end", end);
            console.log("team", team);

            jq(".id").text(`예약 id: ${id}`);
            jq(".room-name").text(`회의실: ${room}`);
            jq(".start-time").text(`시간: ${start} - ${end}`);
            jq(".team-name").text(`팀: ${team}`).data({ team: team });

            jq("#detail_reservation_content").data({
                id: id,
                room: room,
                start: start,
                end: end,
                team: team,
            });

            jq("#detail_reservation_modal").modal("show");
        });
    };

    const isTimeSlotAvailable = (date, room, start, end) => {
        const reservations = mockData[date] || [];
        const startTime = timeToInt(start);
        const endTime = timeToInt(end);

        for (const reservation of reservations) {
            if (reservation.room === room) {
                const existingStartTime = timeToInt(reservation.start);
                const existingEndTime = timeToInt(reservation.end);

                if (
                    (startTime >= existingStartTime &&
                        startTime < existingEndTime) ||
                    (endTime > existingStartTime &&
                        endTime <= existingEndTime) ||
                    (startTime <= existingStartTime &&
                        endTime >= existingEndTime)
                ) {
                    return false;
                }
            }
        }
        return true;
    };

    _pubFn.load = async () => {
        reservationData = await getReservationData({ date: _searchDate });
        console.log("reservation data:", reservationData);
        displayReservationData({ reservationData: reservationData });
    };

    _pubFn.initEventListeners = () => {
        jq("#date_select")
            .datetimepicker({
                format: "YYYY-MM-DD",
                showClose: false,
                dayViewHeaderFormat: "MMMM YYYY",
                defaultDate: _searchDate,
            })
            .on("dp.change", function (e) {
                if (!e.date || !e.oldDate || !e.date.isSame(e.oldDate, "day")) {
                    const dateText = e.date.format("YYYY-MM-DD");
                    console.log("dateText:", dateText);
                    _searchDate = dateText;
                    reserveModule.load();
                }
            });
        jq("#reservation_date").datetimepicker({
            format: "YYYY-MM-DD",
        });

        jq("#reservation_from")
            .datetimepicker({
                format: "HH:mm", // 시간과 분만 표시
                stepping: 60, // 1시간 간격
            })
            .on("dp.change", function handleFromDateChange(e) {
                jq("#reservation_to").data("DateTimePicker").minDate(e.date);
            });

        jq("#reservation_to").datetimepicker({
            format: "HH:mm", // 시간과 분만 표시
            showClose: false,
            stepping: 60, // 1시간 간격
        });

        // 예약하기 버튼 클릭 이벤트
        jq("#reserve_btn").on("click", function () {
            const room = jq("#room_select .dropdown-item.active").data("value");
            const team = jq("#team_select .dropdown-item.active").data("value");
            const datePicker = jq("#reservation_date").data("DateTimePicker");
            const fromPicker = jq("#reservation_from").data("DateTimePicker");
            const toPicker = jq("#reservation_to").data("DateTimePicker");

            if (!room || !team || !datePicker || !fromPicker || !toPicker) {
                alert("모든 필드를 채워주세요.");
                return;
            }

            const date = datePicker.date().format("YYYY-MM-DD");
            const start = fromPicker.date().format("HH:mm");
            const end = toPicker.date().format("HH:mm");

            if (!isTimeSlotAvailable(date, room, start, end)) {
                alert("이미 예약된 시간이 있습니다.");
                return;
            }

            // 예약 데이터 추가
            const newId = Object.values(mockData).flat().length + 1;
            if (!mockData[date]) {
                mockData[date] = [];
            }
            mockData[date].push({ id: newId, room, start, end, team });

            // 모달 닫기
            jq("#reservation_modal").modal("hide");

            // 새로운 예약 데이터로 업데이트
            reserveModule.load(date);
        });

        // 드롭다운 선택 이벤트
        jq("#room_select .dropdown-item").on("click", function () {
            const roomText = jq(this).text();
            jq("#room_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            console.log("roomtext", roomText);
            jq("#select_room_btn").text(roomText);
        });

        jq("#team_select .dropdown-item").on("click", function () {
            const teamText = jq(this).text();
            jq("#team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            console.log("teamText:", teamText);
            jq("#team_select_btn").text(teamText);
        });
        jq("#login_team_select .dropdown-item").on("click", function () {
            const teamText = jq(this).text();
            jq("#login_team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#login_team_select_btn").text(teamText);
        });
        // 로그인 버튼 클릭 이벤트
        jq("#login_btn").on("click", function (e) {
            e.preventDefault();
            const username = jq("#username").val();
            const password = jq("#password").val();
            const team = jq("#login_team_select .dropdown-item.active").data(
                "value"
            );

            if (!username || !password || !team) {
                alert("모든 필드를 채워주세요.");
                return;
            }

            // 로그인 처리 (여기서는 URL 쿼리로 아이디와 팀명을 전달)
            const queryParams = `?username=${username}&team=${team}`;
            window.location.href = window.location.pathname + queryParams;
        });

        // 로그아웃 버튼 클릭 이벤트
        jq("#logout_btn").on("click", function (e) {
            e.preventDefault();
            window.location.href = window.location.pathname;
        });

        // 예약 삭제 버튼 클릭 이벤트
        jq("#del_reservation_btn").on("click", function () {
            const id = jq("#detail_reservation_content").data("id");
            const reservationTeam = jq("#detail_reservation_content").data(
                "team"
            );
            console.log("id", id);
            console.log("reservation", reservationTeam);

            const urlParams = new URLSearchParams(window.location.search);
            const currentTeam = urlParams.get("team");

            console.log("currentTeam:", currentTeam);

            if (reservationTeam !== currentTeam) {
                alert("삭제 권한이 없습니다.");
                return;
            }

            const date = _searchDate;
            mockData[date] = mockData[date].filter(
                (reservation) => reservation.id !== id
            );

            // 모달 닫기
            jq("#detail_reservation_modal").modal("hide");

            // 새로운 예약 데이터로 업데이트
            reserveModule.load(date);
        });
        _pubFn.checkLoginStatus = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const username = urlParams.get("username");
            const team = urlParams.get("team");

            if (username && team) {
                jq(".login-container").addClass("d-none");
                jq("#welcome_message").text(
                    `${username}님 안녕하세요! (Team: ${team})`
                );
                jq("#welcome_container").removeClass("d-none");
            }
        };
    };

    return _pubFn;
})(jq);

jq(document).ready(function () {
    reserveModule.load();
    reserveModule.initEventListeners();
    reserveModule.checkLoginStatus();
});
