const jq = $.noConflict();

// 특정 날짜에 해당하는 data 반환
const mockData = {
    "2024-08-07": [
        { id: 1, room: 1, start: "10:00", end: "12:00", team: "cloudTech" },
        { id: 2, room: 2, start: "14:00", end: "16:00", team: "payRoll" },
        { id: 3, room: 3, start: "09:00", end: "11:00", team: "marketing" },
    ],
    "2024-08-08": [
        { id: 4, room: 1, start: "11:00", end: "13:00", team: "hr" },
        { id: 5, room: 2, start: "12:00", end: "14:00", team: "devOps" },
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
    let isEditing = false;
    let _reservationData;
    const DateTime = luxon.DateTime;
    const today = DateTime.now();
    const todayFormatted = today.toFormat("yyyy-MM-dd");

    let _searchDate = todayFormatted;

    const baseurl = "http://127.0.0.1:8006";

    /**
     *
     * Time 데이터를 Number로 바꾸는 함수
     */
    const timeToNum = (time) => {
        console.log("문제의 시발점:", time);
        const [hours, minutes] = time.split(":");
        return parseInt(hours) + parseInt(minutes) / 60;
    };

    const getMeetingRooms = () => {
        const url = `${baseurl}/api/reservation/meetingrooms/list`;
        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "GET",
                url: url,
            })
                .done((response) => {
                    resolve(response);
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };

    /**
     * 예약정보를 가져오는 함수
     * @param {*} param0
     * @returns
     */
    const getReservationData = ({ date }) => {
        console.log("date", date);
        const url = `${baseurl}/api/reservation/list?book_date=${date}`;
        return new Promise((resolve, reject) => {
            jq("#loader").show();
            jq.ajax({
                type: "GET",
                url: url,
            })
                .done((response) => {
                    jq("#loader").hide();
                    resolve(response);
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };

    /**
     * 특정 날짜에 대한 예약정보를 화면으로 표시하는 함수
     *
     * @param {*} param0
     */
    const displayReservationData = ({ reservationData }) => {
        console.log("reservationData:", reservationData);

        // Slot 세팅
        reservationData.forEach((data) => {
            const start = timeToNum(data.start_time);
            const end = timeToNum(data.end_time);
            const roomRow = jq(`tr[data-room='${data.room}'] td`);
            for (let i = 8; i <= 19; i++) {
                if (i >= start && i < end) {
                    roomRow
                        .eq(i - 7)
                        .addClass(
                            `reserved data-bs-toggle="tooltip" data-bs-title=${data.team}`
                        )
                        .css("background-color", teamColors[data.team])
                        .data({
                            id: data.id,
                            room: data.room,
                            start: data.start_time,
                            end: data.end_time,
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
    /**
     * Update : 예약데이터를 업데이트하는 함수
     * @param {*} param0
     * @returns
     */
    const updateReservationData = ({
        id,
        room_name,
        start_time,
        end_time,
        book_date,
        team_name,
    }) => {
        const url = `${baseurl}/api/reservation/update/${id}`;
        const data = JSON.stringify({
            room_name: room_name,
            team_name: team_name,
            book_date: book_date,
            start_time: `${start_time}:00`,
            end_time: `${end_time}:00`,
        });
        return new Promise((resolve, reject) => {
            jq.ajax({
                url: url,
                type: "PUT",
                data: data,
                contentType: "application/json",
            })
                .done((response) => {
                    alert("수정이 완료되었습니다.");
                    resolve();
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };
    /**
     * DELETE 예약내용을 삭제하는 함수
     * @param {} param0
     * @returns
     */
    const deleteReservationData = ({ id }) => {
        return new Promise((resolve, reject) => {
            jq.ajax({
                url: baseurl + `/api/reservation/delete/${id}`, // API 엔드포인트
                type: "DELETE",
            })
                .done(() => {
                    alert("삭제가 완료되었습니다.");
                    resolve();
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };
    /**
     * CREATE 예약하는 함수
     * @param {*} param0
     * @returns
     */
    const createReservation = ({
        room_name,
        team_name,
        book_date,
        start_time,
        end_time,
    }) => {
        console.log("createReservation called"); // 함수가 호출되었는지 확인

        const url = `${baseurl}/api/reservation/create`;
        const formattedStartTime = `${start_time}:00`;
        const formattedEndTime = `${end_time}:00`;
        const data = JSON.stringify({
            room_name: room_name,
            team_name: team_name,
            book_date: book_date,
            start_time: formattedStartTime,
            end_time: formattedEndTime,
        });
        console.log("data:", data);
        return new Promise((resolve, reject) => {
            jq.ajax({
                url: url,
                type: "POST",
                dataType: "json",
                data: data,
                contentType: "application/json",
            })
                .done((response) => {
                    console.log("시도했음");
                    alert("예약이 완료되었습니다.");
                    resolve(response);
                })
                .fail((error) => {
                    console.log("실패했음");
                    reject(error);
                });
        });
    };
    /**
     * 예약할 때, 자리가 비었는지 리턴하는 함수
     */
    const isTimeSlotAvailable = (date, room, start, end) => {
        const reservations = _reservationData;
        console.log("start:", start);
        console.log("end:", end);
        const startTime = timeToNum(start);
        const endTime = timeToNum(end);
        console.log("startTime:", startTime);
        console.log("endTime:,", endTime);

        for (const reservation of reservations) {
            if (reservation.room === room) {
                const existingStartTime = timeToNum(reservation.start_time);
                const existingEndTime = timeToNum(reservation.end_time);

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
        await reserveModule.loadMeetingRooms();
        _reservationData = await getReservationData({ date: _searchDate });
        displayReservationData({ reservationData: _reservationData });
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
        jq("#reserve_btn").on("click", async function () {
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

            try {
                await createReservation({
                    room_name: room,
                    team_name: team,
                    book_date: date,
                    start_time: start,
                    end_time: end,
                });
            } catch (error) {
                console.log("error:", error);
            }

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
        jq("#del_reservation_btn").on("click", async function () {
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
            try {
                await deleteReservationData({ id: id });
            } catch (error) {
                alert("데이터를 삭제하는데 오류가 발생했습니다.");
            }

            // 모달 닫기
            jq("#detail_reservation_modal").modal("hide");

            // 새로운 예약 데이터로 업데이트
            reserveModule.load(date);
        });

        // jq("#edit_reservation_btn").on("click", async function () {
        //     const reservationTeam = jq(".team-name").data("team");
        //     const urlParams = new URLSearchParams(window.location.search);
        //     const currentTeam = urlParams.get("team");
        //     console.log("currentTeam:", currentTeam);
        //     console.log("reservationTeam:", reservationTeam);
        //     if (reservationTeam !== currentTeam) {
        //         alert("수정 권한이 없습니다.");
        //         return;
        //     }
        //     if (!isEditing) {
        //         jq(".id").replaceWith(
        //             `<input class="id form-control" value="${jq(
        //                 ".id"
        //             ).text()}" disabled />`
        //         );
        //         jq(".room-name").replaceWith(
        //             `<input class="room-name form-control" value="${jq(
        //                 ".room-name"
        //             ).text()}" />`
        //         );
        //         jq(".start-time").replaceWith(
        //             `<input class="start-time form-control" value="${jq(
        //                 ".start-time"
        //             ).text()}" />`
        //         );
        //         jq(".end-time").replaceWith(
        //             `<input class="end-time form-control" value="${jq(
        //                 ".end-time"
        //             ).text()}" />`
        //         );
        //         jq(".team-name").replaceWith(
        //             `<input class="team-name form-control" value="${jq(
        //                 ".team-name"
        //             ).text()}" />`
        //         );

        //         jq(this).text("저장");
        //         isEditing = true;
        //     } else {
        //         const id = jq(".id").val();
        //         const roomName = jq(".room-name").val();
        //         const startTime = jq(".start-time").val();
        //         const endTime = jq(".end-time").val();
        //         const teamName = jq(".team-name").val();

        //         // 서버에 수정된 내용을 보내는 함수 호출
        //         try {
        //             await updateReservationData({
        //                 id,
        //                 room_name: roomName,
        //                 start_time: startTime,
        //                 end_time: endTime,
        //                 team_name: teamName,
        //                 book_date: _searchDate,
        //             });
        //         } catch (error) {
        //             alert("수정하는데 오류가 발생했습니다.");
        //             return;
        //         }

        //         jq(".id").replaceWith(`<p class="id">${id}</p>`);
        //         jq(".room-name").replaceWith(
        //             `<p class="room-name">${roomName}</p>`
        //         );
        //         jq(".start-time").replaceWith(
        //             `<p class="start-time">${startTime}</p>`
        //         );
        //         jq(".end-time").replaceWith(
        //             `<p class="end-time">${endTime}</p>`
        //         );
        //         jq(".team-name").replaceWith(
        //             `<p class="team-name">${teamName}</p>`
        //         );

        //         jq(this).text("수정하기");
        //         isEditing = false;
        //     }
        // });

        /**
         * urlquery로 로그인 상태를 확인
         * 로그인 => username과 team을 띄운다.
         * 로그아웃 => 로그인 폼을 띄운다.
         *
         */
    };
    _pubFn.loadMeetingRooms = async () => {
        try {
            const meetingRooms = await getMeetingRooms();
            const roomRows = {};
            meetingRooms.forEach((room) => {
                roomRows[
                    room.name
                ] = `<tr data-room="${room.name}"><td><span>${room.name}</span></td>`;
                for (let i = 8; i <= 19; i++) {
                    roomRows[room.name] += `<td></td>`;
                }
                roomRows[room.name] += `</tr>`;
            });

            jq(".reserve-items").html(Object.values(roomRows).join(""));
        } catch (error) {
            console.error(
                "회의실 목록을 불러오는데 오류가 발생했습니다:",
                error
            );
        }
    };
    _pubFn.loadReservationSlots = async () => {
        try {
            const reservationData = await getReservationData(_searchDate);

            // 예약 슬롯 정보 추가
            reservationData.forEach((data) => {
                const start = timeToNum(data.start_time);
                const end = timeToNum(data.end_time);
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
                                start: data.start_time,
                                end: data.end_time,
                                team: data.team,
                            });
                    }
                }
            });

            // 예약된 슬롯 클릭 이벤트 처리
            jq(".reserved").on("click", function () {
                const id = jq(this).data("id");
                const room = jq(this).data("room");
                const start = jq(this).data("start");
                const end = jq(this).data("end");
                const team = jq(this).data("team");

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
        } catch (error) {
            console.error("예약 정보를 불러오는데 오류가 발생했습니다:", error);
        }
    };
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

    return _pubFn;
})(jq);

jq(document).ready(function () {
    reserveModule.load();
    reserveModule.initEventListeners();
    reserveModule.checkLoginStatus();
});
