const jq = $.noConflict();

// 팀 색상 매핑
// const teamColors = {
//     cloudTech: "#007bff",
//     payRoll: "#28a745",
//     marketing: "#dc3545",
//     devOps: "#ffc107",
//     hr: "#17a2b8",
//     finance: "#6610f2",
// };

const reserveModule = ((jq) => {
    let _pubFn = {};
    let _reservationData;
    let _meetingRooms;
    let _teams;
    let _selectedCells = [];
    let isMouseDown = false;
    let startCellIndex = null;
    let _selectRoom;
    const DateTime = luxon.DateTime;
    const today = DateTime.now();
    const todayFormatted = today.toFormat("yyyy-MM-dd");

    let _searchDate = todayFormatted;

    const baseurl = "http://127.0.0.1:8011";
    /**
     * TODO:: 팀 생성 API
     */
    const createTeam = async ({ teamData }) => {
        console.log("teamData:", teamData);
        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "POST",
                url: `${baseurl}/api/team/create`,
                dataType: "json",
                data: JSON.stringify(teamData),
                contentType: "application/json",
            })
                .done((response) => {
                    resolve(response);
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };
    const removeTeam = ({ teamKey }) => {
        const url = `${baseurl}/api/team/delete/${teamKey}`;
        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "DELETE",
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
     *
     * Time 데이터를 Number로 바꾸는 함수
     */
    const timeToNum = (time) => {
        const [hours, minutes] = time.split(":");
        return parseInt(hours) * 2 + parseInt(minutes) / 30;
    };

    /**
     * 회의실을 가져오는 함수
     * @returns {Promise} 회의실을 리턴
     */
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
     * 팀을 가져오는 함수
     */
    const getTeamList = () => {
        const url = `${baseurl}/api/team/list`;
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
    const removeRoom = ({ roomKey }) => {
        const url = `${baseurl}/api/reservation/delete/room/${roomKey}`;
        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "DELETE",
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
        console.log("displayReservationData:", reservationData);
        reservationData.forEach((data) => {
            const start = timeToNum(data.start_time); // 30분 단위 인덱스로 변환
            const end = timeToNum(data.end_time); // 30분 단위 인덱스로 변환
            const roomRow = jq(`tr[data-room='${data.room}'] td`);

            for (let i = start; i < end; i++) {
                const cell = roomRow.eq(i - 9);
                cell.addClass("reserved")
                    .css("background-color", data.team_color)
                    .data({
                        id: data.id,
                        room: data.room,
                        start: data.start_time,
                        end: data.end_time,
                        team: data.team,
                    })
                    .attr("data-bs-toggle", "tooltip")
                    .attr(
                        "title",
                        `${data.team} (${data.start_time} - ${data.end_time})`
                    );
            }
        });

        // Tooltip 초기화
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        jq(".reserved").on("click", function () {
            const id = jq(this).data("id");
            const room = jq(this).data("room");
            const start = jq(this).data("start");
            const end = jq(this).data("end");
            const team = jq(this).data("team");
            const isAdmin = getCookie("admin");

            // 본인의 팀이 아니라면, 삭제와 수정이 불가능
            const urlParams = new URLSearchParams(window.location.search);
            const currentTeam = urlParams.get("team");
            if (currentTeam !== team && !isAdmin) {
                jq("#del_reservation_btn").hide();
                jq("#edit_reservation_btn").hide();
            } else {
                jq("#del_reservation_btn").show();
                jq("#edit_reservation_btn").show();
            }

            jq(".id").val(`${id}`);
            jq(".room-name").val(`${room}`);
            jq(".start-time").val(`${start}`);
            jq(".end-time").val(`${end}`);
            jq(".team-name").val(`${team}`).data({ team: team });

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
            start_time: `${start_time}`,
            end_time: `${end_time}`,
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
     * 로그인하는 함수
     * @param {object} LoginData
     * @returns {Promise} 로그인 성공여부, admin 여부
     */
    const login = ({ loginData }) => {
        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "POST",
                url: `${baseurl}/api/user/login`,
                dataType: "json",
                data: JSON.stringify(loginData),
                contentType: "application/json",
            })
                .done((response) => {
                    console.log("로그인 response:", response);
                    resolve(response);
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
        return new Promise((resolve, reject) => {
            jq.ajax({
                url: url,
                type: "POST",
                dataType: "json",
                data: data,
                contentType: "application/json",
            })
                .done((response) => {
                    alert("예약이 완료되었습니다.");
                    resolve(response);
                })
                .fail((error) => {
                    reject(error);
                });
        });
    };
    /**
     * 회의실 생성하는 함수
     * @param {*} param0
     * @returns
     */
    const createRoom = ({ roomName }) => {
        const data = {
            name: roomName,
        };
        return new Promise((resolve, reject) => {
            jq.ajax({
                url: `${baseurl}/api/reservation/meetingroom/create`,
                type: "POST",
                dataType: "json",
                data: JSON.stringify(data),
                contentType: "application/json",
            })
                .done((response) => {
                    resolve(response);
                })
                .fail((error) => {
                    if (error.status === 400) {
                        alert(`에러: ${error.responseJSON.detail}`);
                    }
                    reject(error);
                });
        });
    };
    /**
     * 예약할 때, 자리가 비었는지 리턴하는 함수
     * @param {*} date - 예약하고자 하는 날짜
     * @param {*} room - 예약하고자 하는 회의실 이름
     * @param {*} start - 예약 시작 시간
     * @param {*} end - 예약 종료 시간
     * @param {*} excludeId - 수정 시 제외할 예약 ID
     * @returns
     */
    const isTimeSlotAvailable = (date, room, start, end, excludeId = null) => {
        const reservations = _reservationData;
        const startTime = timeToNum(start);
        const endTime = timeToNum(end);

        for (const reservation of reservations) {
            const reservationDate = reservation.book_date;
            const reservationStartTime = timeToNum(reservation.start_time);
            const reservationEndTime = timeToNum(reservation.end_time);

            if (
                reservation.room === room &&
                reservationDate === date &&
                reservation.id !== parseInt(excludeId)
            ) {
                if (
                    (startTime >= reservationStartTime &&
                        startTime < reservationEndTime) ||
                    (endTime > reservationStartTime &&
                        endTime <= reservationEndTime) ||
                    (startTime <= reservationStartTime &&
                        endTime >= reservationEndTime)
                ) {
                    return false;
                }
            }
        }
        return true;
    };
    const setTeams = () => {
        jq("#team_select").empty();
        jq("#login_team_select").empty();
        jq("#remove_team_select").empty();

        // _teams 배열을 순회하며 각 team의 이름을 드롭다운 목록에 추가합니다.
        _teams.forEach((team) => {
            // 두 개의 별도 listItem을 각각 생성
            const loginListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(team.name)
                    .data("value", team.name)
                    .data("key", team.key)
            );

            const teamListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(team.name)
                    .data("value", team.name)
                    .data("key", team.key)
            );
            const removeTeamListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(team.name)
                    .data("value", team.name)
                    .data("key", team.key)
            );

            // 각각의 드롭다운에 추가
            jq("#login_team_select").append(loginListItem);
            jq("#team_select").append(teamListItem);
            jq("#remove_team_select").append(removeTeamListItem);
        });
    };

    _pubFn.load = async () => {
        await reserveModule.loadMeetingRooms();
        _teams = await getTeamList();
        setTeams();
        console.log("teams:", _teams);
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
                    _searchDate = dateText;
                    reserveModule.load();
                }
            });
        jq("#reservation_date").datetimepicker({
            format: "YYYY-MM-DD",
        });

        jq("#reservation_from")
            .datetimepicker({
                format: "LT", // 시간과 분만 표시
                stepping: 30, // 1시간 간격
            })
            .on("dp.change", function handleFromDateChange(e) {
                jq("#reservation_to").data("DateTimePicker").minDate(e.date);
            });

        jq("#reservation_to").datetimepicker({
            format: "LT", // 시간과 분만 표시
            stepping: 30, // 1시간 간격
        });

        // 예약하기 버튼 클릭 이벤트
        jq("#reserve_btn").on("click", async function (e) {
            e.preventDefault();
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

        // 모달이 닫힐 때 모든 필드 초기화
        jq("#reservation_modal").on("hidden.bs.modal", function () {
            jq("#reservation_from").data("DateTimePicker").clear();
            jq("#reservation_to").data("DateTimePicker").clear();
            jq("#reservation_date").data("DateTimePicker").clear();
            jq("#select_room_btn").text("회의실 선택");
            jq("#room_select .dropdown-item").removeClass("active");
            jq("#team_select_btn").text("팀 선택");
            jq("#team_select .dropdown-item").removeClass("active");
        });

        // 드롭다운 선택 이벤트
        jq(document).on("click", "#room_select .dropdown-item", function (e) {
            e.preventDefault();
            const roomText = jq(this).text();
            jq("#room_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#select_room_btn").text(roomText);
        });

        // 팀 선택
        jq(document).on("click", "#team_select .dropdown-item", function (e) {
            e.preventDefault();
            const teamText = jq(this).text();
            jq("#team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#team_select_btn").text(teamText);
        });
        jq("#login_team_select").on("click", ".dropdown-item", function (e) {
            e.preventDefault();
            const teamText = jq(this).text();
            console.log("teamText:", teamText);
            jq("#login_team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#login_team_select_btn").text(teamText);
        });

        // 로그인 버튼 클릭 이벤트
        jq("#login_btn").on("click", async function (e) {
            e.preventDefault();
            const userName = jq("#username").val();
            const password = jq("#password").val();
            const team = jq("#login_team_select .dropdown-item.active").data(
                "value"
            );

            if (!userName || !password) {
                alert("모든 필드를 채워주세요.");
                return;
            }

            // 로그인 처리 (여기서는 URL 쿼리로 아이디와 팀명을 전달)

            const loginData = {
                id: userName,
                password: password,
                team: team ? team : "",
            };
            try {
                const a = await login({ loginData: loginData });
                if (a.isAdmin === "true") {
                    setCookie("admin", "true", 1);
                    _pubFn.checkLoginStatus();
                } else {
                    const queryParams = `?username=${userName}&team=${team}`;
                    window.location.href =
                        window.location.pathname + queryParams;
                }
            } catch (error) {
                alert("로그인 도중 문제가 발생했습니다.");
                console.log("error:", error);
            }
        });

        // 로그아웃 버튼 클릭 이벤트
        jq("#logout_btn").on("click", function (e) {
            e.preventDefault();
            if (getCookie("admin")) {
                deleteCookie("admin");
                window.location.reload();
                return;
            }
            window.location.href = window.location.pathname;
        });

        /**
         * 예약 삭제 이벤트
         *
         */
        jq("#del_reservation_btn").on("click", async function (e) {
            e.preventDefault();
            const id = jq("#detail_reservation_content").data("id");
            const reservationTeam = jq("#detail_reservation_content").data(
                "team"
            );

            const urlParams = new URLSearchParams(window.location.search);
            const currentTeam = urlParams.get("team");

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

        /**
         * 수정하기 (버튼 클릭 이벤트)
         */
        jq(document).on("click", "#edit_reservation_btn", function (e) {
            e.preventDefault();
            jq(".detail_reservation_item").prop("readonly", false);

            // 현재 선택된 회의실 값
            const currentRoom = jq(".room-name").val();

            // 회의실 옵션 동적 생성 및 기본값 설정
            let roomOptions = `<select class="form-control detail_reservation_item room-name">`;
            _meetingRooms.forEach((room) => {
                roomOptions += `<option value="${room.name}" ${
                    currentRoom === room.name ? "selected" : ""
                }>${room.name}</option>`;
            });
            roomOptions += `</select>`;
            jq(".room-name").replaceWith(roomOptions);

            // 시간 필드를 datetimepicker로 변경하고 기본값을 설정
            // 기존의 값을 moment로 파싱
            const startTimeVal = moment(jq(".start-time").val(), "HH:mm");
            const endTimeVal = moment(jq(".end-time").val(), "HH:mm");

            jq(".start-time").replaceWith(
                `<input class="form-control detail_reservation_item start-time datetimepicker" type="text">`
            );
            jq(".end-time").replaceWith(
                `<input class="form-control detail_reservation_item end-time datetimepicker" type="text">`
            );

            jq(".start-time").datetimepicker({
                format: "HH:mm",
                stepping: 30,
                defaultDate: startTimeVal, // 기본값 설정
            });

            jq(".end-time").datetimepicker({
                format: "HH:mm",
                stepping: 30,
                defaultDate: endTimeVal, // 기본값 설정
            });

            // 팀 필드를 드롭다운으로 변경하고 기본값을 설정
            const currentTeam = jq(".team-name").val();
            let teamOptions = `<select class="form-control detail_reservation_item team-name">`;
            _teams.forEach((team) => {
                teamOptions += `<option value="${team.name}" ${
                    currentTeam === team.name ? "selected" : ""
                }>${team.name}</option>`;
            });
            teamOptions += `</select>`;
            jq(".team-name").replaceWith(teamOptions);

            // 포커스를 회의실 드롭다운으로 이동
            jq(".room-name").focus();
            jq(".detail_reservation_item").addClass("blinking");

            // 수정 버튼을 저장 버튼으로 변경
            jq(this).text("저장하기").attr("id", "save_reservation_btn");
        });

        // 저장하기 버튼 클릭 이벤트
        jq(document).on("click", "#save_reservation_btn", async function (e) {
            e.preventDefault();
            const id = jq(".id").val();
            const roomName = jq(".room-name").val();

            // 시작 시간과 종료 시간을 각각 가져옴
            const startTime = jq(".start-time").val();
            const endTime = jq(".end-time").val();

            const teamName = jq(".team-name").val();
            // 수정된 시간과 방으로 예약 가능 여부를 확인
            const isAvailable = isTimeSlotAvailable(
                _searchDate,
                roomName,
                startTime,
                endTime,
                id
            );

            if (!isAvailable) {
                alert("이미 예약된 시간이 있습니다.");
                return; // 시간이 겹친다면 저장하지 않음
            }

            // 서버에 수정된 내용을 보내는 함수 호출
            try {
                await updateReservationData({
                    id,
                    room_name: roomName,
                    start_time: startTime,
                    end_time: endTime,
                    team_name: teamName,
                    book_date: _searchDate,
                });

                // 요청이 성공하면 다시 모든 input 필드를 readonly 상태로 전환
                jq(".detail_reservation_item").prop("readonly", true);
                jq(".detail_reservation_item").removeClass("blinking");

                // 버튼 텍스트를 "수정하기"로 변경하고, id를 다시 edit_reservation_btn으로 변경
                jq(this).text("수정하기").attr("id", "edit_reservation_btn");
                jq("#detail_reservation_modal").modal("hide");
                reserveModule.load();
            } catch (error) {
                alert("수정하는데 오류가 발생했습니다.");
            }
        });
        // Add the event listener for the bi-caret-left icon
        jq(".bi-caret-left").on("mousedown", function () {
            jq(this)
                .removeClass("bi-caret-left")
                .addClass("bi-caret-left-fill");

            // Decrement the date by one day
            let currentDate = jq("#date_select").data("DateTimePicker").date();
            if (currentDate) {
                let newDate = currentDate.subtract(1, "days");
                jq("#date_select").data("DateTimePicker").date(newDate);
            }
        });

        jq(".bi-caret-left").on("mouseup mouseleave", function () {
            jq(this)
                .removeClass("bi-caret-left-fill")
                .addClass("bi-caret-left");
        });

        // Add the event listener for the bi-caret-right icon
        jq(".bi-caret-right").on("mousedown", function () {
            jq(this)
                .removeClass("bi-caret-right")
                .addClass("bi-caret-right-fill");

            // Increment the date by one day
            let currentDate = jq("#date_select").data("DateTimePicker").date();
            if (currentDate) {
                let newDate = currentDate.add(1, "days");
                jq("#date_select").data("DateTimePicker").date(newDate);
            }
        });

        jq(".bi-caret-right").on("mouseup mouseleave", function () {
            jq(this)
                .removeClass("bi-caret-right-fill")
                .addClass("bi-caret-right");
        });
        jq(document).on("mousedown", ".reserve-items td", function (e) {
            if (jq(this).hasClass("reserved")) return; // 예약된 셀은 무시
            const roomName = jq(e.target)
                .closest(".reserve-items td")
                .closest("tr")
                .data("room");

            isMouseDown = true;
            startCellIndex = jq(this).index();
            _selectedCells.push(jq(this));
            _selectRoom = roomName;

            jq(this).addClass("select"); // 시각적 강조

            return false; // 텍스트 드래그 방지
        });

        jq(document).on("mouseover", ".reserve-items td", function (e) {
            const roomName = jq(e.target)
                .closest(".reserve-items td")
                .closest("tr")
                .data("room");
            if (isMouseDown) {
                const cellIndex = jq(this).index();

                if (
                    cellIndex >= startCellIndex &&
                    !jq(this).hasClass("reserved") &&
                    roomName === _selectRoom
                ) {
                    _selectedCells.push(jq(this));
                    jq(this).addClass("select"); // 시각적 강조
                } else {
                    jq(this).css("cursor", "not-allowed"); // 커서를 "막힘"으로 변경
                }
            }
        });

        jq(document).on("mouseup", function (e) {
            const target = jq(e.target);
            const tdElement = target.closest(".reserve-items td");
            const roomName = tdElement.closest("tr").data("room");

            if (isMouseDown) {
                isMouseDown = false;

                if (_selectedCells.length > 0) {
                    const startTime = calculateTime(
                        _selectedCells[0].index() + 1
                    );
                    const endTime = calculateTime(
                        _selectedCells[_selectedCells.length - 1].index() + 2
                    );
                    showReservationModal(startTime, endTime, _selectRoom);
                }

                // 선택한 셀 초기화
                _selectedCells.forEach((cell) => cell.removeClass("select"));
                _selectedCells = [];
                jq(".reserve-items td").each(function () {
                    if (jq(this).css("cursor") === "not-allowed") {
                        jq(this).css("cursor", "pointer"); // pointer로 복원
                    }
                });
            }
        });

        // 예약 모달을 표시하는 함수
        function showReservationModal(startTime, endTime, roomName) {
            // 모달에 선택된 시간 기본값 설정
            jq("#reservation_from")
                .data("DateTimePicker")
                .date(moment(startTime, "HH:mm"));
            jq("#reservation_to")
                .data("DateTimePicker")
                .date(moment(endTime, "HH:mm"));
            jq("#reservation_date")
                .data("DateTimePicker")
                .date(moment(_searchDate, "YYYY-MM-DD"));
            const matchingItem = jq("#room_select .dropdown-item").filter(
                function () {
                    return jq(this).data("value") === roomName;
                }
            );
            matchingItem.addClass("active");
            jq("#select_room_btn").text(roomName);

            // 모달 띄우기
            jq("#reservation_modal").modal("show");
        }
        function calculateTime(cellIndex) {
            const baseHour = 4; // 기본 시작 시간은 04:00
            const hour = Math.floor((baseHour * 2 + cellIndex) / 2); // cellIndex를 2로 나누어 시간을 계산
            const minute = (cellIndex % 2) * 30; // cellIndex가 짝수면 00분, 홀수면 30분
            return `${hour < 10 ? "0" : ""}${hour}:${
                minute === 0 ? "00" : minute
            }`;
        }
        // 회의실 드롭다운 메뉴 추가 (삭제)
        jq("#remove_meetingroom_modal").on("click", function () {
            // 기존의 목록을 비웁니다.
            jq("#delete_room_select").empty();

            // _meetingRooms 배열을 순회하며 각 room의 이름을 드롭다운 목록에 추가합니다.
            _meetingRooms.forEach((room) => {
                const listItem = jq("<li></li>").append(
                    jq("<a></a>")
                        .addClass("dropdown-item")
                        .attr("href", "#")
                        .text(room.name)
                        .data("value", room.name)
                        .data("key", room.id)
                );
                jq("#delete_room_select").append(listItem);
            });
        });
        // 회의실 드롭다운 메뉴 선택 시, 텍스트변경
        jq("#delete_room_select").on("click", ".dropdown-item", function () {
            // 클릭된 항목의 텍스트를 가져옴
            const selectedText = jq(this).text();
            const seletedKey = jq(this).data("key");
            // 버튼의 텍스트를 선택된 항목의 텍스트로 변경
            jq("#delete_select_room_btn").text(selectedText);
            jq("#delete_select_room_btn").data("key", seletedKey);
        });
        // 회의실 삭제 버튼
        jq("#remove_meetingroom").on("click", async function () {
            const removeKey = jq("#delete_select_room_btn").data("key");
            try {
                await removeRoom({ roomKey: removeKey });
                alert("회의실 삭제 완료");
                jq("#remove_meetingroom_modal").modal("hide");
                reserveModule.load();
            } catch (error) {
                alert(
                    "회의실을 삭제하는데 에러가 발생했습니다. 다시 시도해주세요"
                );
                console.error(error);
            }
        });
        // 회의실 추가 버튼
        jq("#create_meetingroom").on("click", async function () {
            const roomName = jq("#meetingroom_name").val();
            try {
                await createRoom({ roomName: roomName });
                alert("회의실 생성이 완료되었습니다.");
                jq("#create_meetingroom_modal").modal("hide");
                reserveModule.load();
            } catch (error) {
                alert("회의실 생성하는데 오류가 발생했습니다.");
                console.log("error:", error);
                return;
            }
        });
        // 팀생성
        jq("#create_team").on("click", async function () {
            const teamName = jq("#team_name").val();
            const teamColor = jq("#team_color").val(); // 선택된 색상값 가져오기

            if (!teamName) {
                alert("팀 이름을 입력해 주세요.");
                return;
            }

            // 팀 정보를 서버로 전송하거나 로컬에서 처리하는 로직 추가
            try {
                // 예시로, 콘솔에 팀 이름과 색상 출력
                console.log("팀 이름:", teamName);
                console.log("팀 색상:", teamColor);
                const teamData = {
                    name: teamName,
                    color: teamColor,
                };
                await createTeam({ teamData: teamData });

                alert("팀이 추가되었습니다.");
                reserveModule.load();
                jq("#create_team_modal").modal("hide");
            } catch (error) {
                console.error("팀을 추가하는데 오류가 발생했습니다:", error);
                alert("팀을 추가하는데 오류가 발생했습니다.");
            }
        });
        jq("#remove_team_select").on("click", ".dropdown-item", function () {
            // 클릭된 항목의 텍스트를 가져옴
            const selectedText = jq(this).text();
            const seletedKey = jq(this).data("key");
            console.log("selectedText:", selectedText);
            console.log("selectedKey:", seletedKey);
            // 버튼의 텍스트를 선택된 항목의 텍스트로 변경
            jq("#delete_select_team_btn").text(selectedText);
            jq("#delete_select_team_btn").data("key", seletedKey);
        });
        jq("#remove_team").on("click", async function () {
            const removeKey = jq("#delete_select_team_btn").data("key");
            try {
                await removeTeam({ teamKey: removeKey });
                alert("팀 삭제 완료!");
                jq("#remove_meetingroom_modal").modal("hide");
                reserveModule.load();
            } catch (error) {
                alert("팀을 삭제하는데 오류가 발생했습니다.:", error);
            }
        });
    };
    /**
     * 회의실을 가져오고, 그 회의실에 맞게 table의 row를 추가한다
     *
     */
    _pubFn.loadMeetingRooms = async () => {
        jq("#loader").show();
        try {
            _meetingRooms = await getMeetingRooms();
            console.log("meetingRooms:", _meetingRooms);
            console.log("mettingromms.length:", typeof _meetingRooms.length);
            if (_meetingRooms.length === 0) {
                console.log("1");
                jq(".reservation-container").hide();
                jq("#none_container").show();
            } else {
                console.log("2");
                jq(".reservation-container").show();
                jq("#none_container").css("display", "none");
            }
            const roomRows = {};
            jq("#room_select").empty();
            _meetingRooms.forEach((room) => {
                roomRows[
                    room.name
                ] = `<tr data-room="${room.name}"><td style="pointer-events: none; cursor: not-allowed; min-width:140px"><span>${room.name}</span></td>`;
                for (let i = 5; i <= 39; i++) {
                    roomRows[room.name] += `<td></td>`;
                }
                roomRows[room.name] += `</tr>`;

                jq("#room_select")
                    .append(`<li><a class="dropdown-item" href="#" data-value="${room.name}">${room.name}</a></li>
                    `);
            });

            jq(".reserve-items").html(Object.values(roomRows).join(""));
        } catch (error) {
            console.error(
                "회의실 목록을 불러오는데 오류가 발생했습니다:",
                error
            );
        }
    };
    /**
     * urlParam에 username과 team에 있다면, 로그인 된 것으로 간주하고 화면표시
     * 로그인 => username과 team을 띄운다.
     * 로그아웃 => 로그인 폼을 띄운다.
     */
    _pubFn.checkLoginStatus = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const userName = urlParams.get("username");
        const team = urlParams.get("team");
        const isAdmin = getCookie("admin");

        // 관리자 계정일 때만 버튼을 보여줍니다.
        if (isAdmin) {
            jq("#create_team_btn").show();
            jq("#remove_team_btn").show();
            jq("#create_meetingroom_btn").show();
            jq("#remove_meetingroom_btn").show();

            jq(".login-container").addClass("d-none");
            jq("#welcome_message").text(`관리자계정`).css("font-size", "20px");
            jq("#welcome_container").removeClass("d-none");
            return;
        }

        if (userName && team) {
            jq(".login-container").addClass("d-none");
            jq("#welcome_message").text(
                `${userName}님 안녕하세요! (Team: ${team})`
            );
            jq("#welcome_container").removeClass("d-none");
        }
    };

    const setCookie = (name, value, exp) => {
        const date = new Date();
        date.setTime(date.getTime() + exp * 24 * 60 * 60 * 1000);
        document.cookie =
            name + "=" + value + ";expires" + date.toUTCString() + ";path=/";
    };
    const getCookie = (name) => {
        const value = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return value ? value[2] : null;
    };
    const deleteCookie = (name) => {
        document.cookie = name + "=; expires=Thu, 01 Jan 1999 00:00:10 GMT;";
    };

    return _pubFn;
})(jq);

jq(document).ready(function () {
    reserveModule.load();
    reserveModule.initEventListeners();
    reserveModule.checkLoginStatus();
});
