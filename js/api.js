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

const sanitizeInput = (input) => {
    // null 또는 undefined인 경우 빈 문자열 반환
    if (input === null || input === undefined) {
        return "";
    }

    // 입력값이 문자열이 아닌 경우, 문자열로 변환
    if (typeof input !== "string") {
        input = String(input);
    }

    // 위험한 태그나 패턴이 포함된 경우, 즉시 빈 문자열 반환
    const dangerousPatterns = [
        /<script.*?>.*?<\/script>/gi, // <script> 태그 차단
        /alert\(/gi, // alert() 함수 호출 차단
        /onerror\s*=/gi, // onerror 이벤트 차단
        /javascript:/gi, // javascript: URL 차단
        /<img.*?onerror\s*=/gi, // 이미지 태그의 onerror 이벤트 차단
    ];

    // 위험한 패턴이 입력값에 포함되어 있으면, 빈 문자열 반환
    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return ""; // 위험한 입력 발견 시 빈 문자열 반환
        }
    }

    // 태그(<, >)는 제거
    return input.replace(/[<>]/g, "");
};

const reserveModule = ((jq) => {
    let _pubFn = {};
    let _reservationData;
    let _meetingRooms;
    let _teams;
    let _selectedCells = [];
    let scrollInterval = null;
    let isMouseDown = false;
    let startCellIndex = null;
    let endCellIndex = null;
    let _selectRoom;
    let _filterTeam = "";

    const DateTime = luxon.DateTime;
    const today = DateTime.now();
    const todayFormatted = today.toFormat("yyyy-MM-dd");

    let _searchDate = todayFormatted;

    const baseurl = "http://127.0.0.1:8012";
    /**
     * TODO:: 팀 생성 API
     */
    const createTeam = async ({ teamData }) => {
        teamData.name = sanitizeInput(teamData.name);
        teamData.color = sanitizeInput(teamData.color);

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
        const sanitizedTeamKey = sanitizeInput(teamKey);
        const url = `${baseurl}/api/team/delete/${sanitizedTeamKey}`;

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
                    // 서버에서 받은 데이터는 바로 DOM에 삽입하지 않고, 필요한 필터링을 적용할 수 있습니다.
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
        // 사용자 입력 필터링
        const sanitizedRoomKey = sanitizeInput(roomKey);
        const url = `${baseurl}/api/reservation/delete/room/${sanitizedRoomKey}`;

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
        // 사용자 입력 필터링
        const sanitizedDate = sanitizeInput(date);
        const sanitizedTeamKey = sanitizeInput(_filterTeam);

        const url = `${baseurl}/api/reservation/list?book_date=${sanitizedDate}&team_key=${sanitizedTeamKey}`;

        return new Promise((resolve, reject) => {
            jq("#loader").show();
            jq.ajax({
                type: "GET",
                url: url,
            })
                .done((response) => {
                    jq("#loader").hide();
                    resolve(response); // 서버 응답은 안전하다고 가정
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

            const urlParams = new URLSearchParams(window.location.search);
            const currentTeam = sanitizeInput(urlParams.get("team")); // URL 파라미터 필터링

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
        // 사용자 입력 필터링
        const sanitizedRoomName = sanitizeInput(room_name);
        const sanitizedStartTime = sanitizeInput(start_time);
        const sanitizedEndTime = sanitizeInput(end_time);
        const sanitizedBookDate = sanitizeInput(book_date);
        const sanitizedTeamName = sanitizeInput(team_name);

        const url = `${baseurl}/api/reservation/update/${sanitizeInput(id)}`;
        const data = JSON.stringify({
            room_name: sanitizedRoomName,
            team_name: sanitizedTeamName,
            book_date: sanitizedBookDate,
            start_time: sanitizedStartTime,
            end_time: sanitizedEndTime,
        });
        console.log("수정데이터:", data);

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
        // 사용자 입력 필터링
        loginData.id = sanitizeInput(loginData.id);
        loginData.password = sanitizeInput(loginData.password);
        loginData.team = sanitizeInput(loginData.team); // 팀 필터링

        return new Promise((resolve, reject) => {
            jq.ajax({
                type: "POST",
                url: `${baseurl}/api/user/login`,
                dataType: "json",
                data: JSON.stringify(loginData),
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
    /**
     * DELETE 예약내용을 삭제하는 함수
     * @param {} param0
     * @returns
     */
    const deleteReservationData = ({ id }) => {
        // 사용자 입력 필터링
        const sanitizedId = sanitizeInput(id);

        return new Promise((resolve, reject) => {
            jq.ajax({
                url: `${baseurl}/api/reservation/delete/${sanitizedId}`,
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
        // 사용자 입력 필터링
        const sanitizedRoomName = sanitizeInput(room_name);
        const sanitizedTeamName = sanitizeInput(team_name);
        const sanitizedBookDate = sanitizeInput(book_date);
        const sanitizedStartTime = sanitizeInput(start_time);
        const sanitizedEndTime = sanitizeInput(end_time);

        const url = `${baseurl}/api/reservation/create`;
        const data = JSON.stringify({
            room_name: sanitizedRoomName,
            team_name: sanitizedTeamName,
            book_date: sanitizedBookDate,
            start_time: `${sanitizedStartTime}:00`,
            end_time: `${sanitizedEndTime}:00`,
        });
        console.log("예약만들기:", data);
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
        // 사용자 입력 필터링
        const sanitizedRoomName = sanitizeInput(roomName);

        const data = { name: sanitizedRoomName };
        if (sanitizedRoomName === "") {
            throw new Error("정상적인 값을 입력해 주세요");
        }

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
        // 사용자 입력 필터링
        const sanitizedDate = sanitizeInput(date);
        const sanitizedRoom = sanitizeInput(room);
        const sanitizedStart = sanitizeInput(start);
        const sanitizedEnd = sanitizeInput(end);

        const reservations = _reservationData;
        const startTime = timeToNum(sanitizedStart);
        const endTime = timeToNum(sanitizedEnd);

        for (const reservation of reservations) {
            const reservationDate = reservation.book_date;
            const reservationStartTime = timeToNum(reservation.start_time);
            const reservationEndTime = timeToNum(reservation.end_time);

            if (
                reservation.room === sanitizedRoom &&
                reservationDate === sanitizedDate &&
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
        jq("#filter_team_select").empty();
        jq("#color-items").empty();

        jq("#filter_team_select").append(
            `<li><a href="#" class="dropdown-item">전체보기</a></li>`
        );
        _teams.forEach((team) => {
            // 팀 이름과 색상을 필터링
            const sanitizedTeamName = truncateText(
                sanitizeInput(team.name),
                10,
                20
            );
            const sanitizedTeamColor = sanitizeInput(team.color);

            const loginListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(sanitizedTeamName) // 필터링된 값 삽입
                    .data("value", sanitizedTeamName)
                    .data("key", team.key)
            );

            const teamListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(sanitizedTeamName)
                    .data("value", sanitizedTeamName)
                    .data("key", team.key)
            );

            const removeTeamListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(sanitizedTeamName)
                    .data("value", sanitizedTeamName)
                    .data("key", team.key)
            );

            const filterTeamListItem = jq("<li></li>").append(
                jq("<a></a>")
                    .addClass("dropdown-item")
                    .attr("href", "#")
                    .text(sanitizedTeamName)
                    .data("value", sanitizedTeamName)
                    .data("key", team.key)
            );

            jq("#login_team_select").append(loginListItem);
            jq("#team_select").append(teamListItem);
            jq("#remove_team_select").append(removeTeamListItem);
            jq("#filter_team_select").append(filterTeamListItem);

            const colorItem = `
            <div class="col-3 d-flex align-items-center m-1">
                    <div style="background-color: ${sanitizedTeamColor}; width: 20px; height: 20px; margin-right: 10px; border-radius: 50%;"></div>
                    <p class="h6 m-0">${sanitizedTeamName}</p>
            </div>`;
            jq("#color-items").append(colorItem);
        });
    };

    _pubFn.load = async () => {
        await reserveModule.loadMeetingRooms();
        _teams = await getTeamList();
        setTeams();
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
                icons: {
                    time: "fa fa-clock", // 시간 아이콘
                    date: "fa fa-calendar", // 달력 아이콘
                    up: "fa fa-chevron-up", // 위로 이동 아이콘
                    down: "fa fa-chevron-down", // 아래로 이동 아이콘
                    previous: "fa fa-chevron-left", // 이전 달로 이동 아이콘
                    next: "fa fa-chevron-right", // 다음 달로 이동 아이콘
                    today: "fa fa-calendar-check-o", // 오늘로 이동하는 아이콘
                    clear: "fa fa-trash", // 지우기 아이콘
                    close: "fa fa-times", // 닫기 아이콘
                },
            })
            .on("dp.change", function (e) {
                if (!e.date || !e.oldDate || !e.date.isSame(e.oldDate, "day")) {
                    const dateText = sanitizeInput(e.date.format("YYYY-MM-DD")); // 날짜 필터링
                    _searchDate = dateText;
                    reserveModule.load();
                }
            });
        jq("#reservation_date").datetimepicker({
            format: "YYYY-MM-DD",
            icons: {
                time: "fa fa-clock", // 시간 아이콘
                date: "fa fa-calendar", // 달력 아이콘
                up: "fa fa-chevron-up", // 위로 이동 아이콘
                down: "fa fa-chevron-down", // 아래로 이동 아이콘
                previous: "fa fa-chevron-left", // 이전 달로 이동 아이콘
                next: "fa fa-chevron-right", // 다음 달로 이동 아이콘
                today: "fa fa-calendar-check-o", // 오늘로 이동하는 아이콘
                clear: "fa fa-trash", // 지우기 아이콘
                close: "fa fa-times", // 닫기 아이콘
            },
        });

        jq("#reservation_from")
            .datetimepicker({
                format: "LT", // 시간과 분만 표시
                stepping: 30, // 30분 간격
                icons: {
                    time: "fa fa-clock", // 시간 아이콘
                    date: "fa fa-calendar", // 날짜 아이콘
                    up: "fa fa-chevron-up",
                    down: "fa fa-chevron-down",
                    previous: "fa fa-chevron-left",
                    next: "fa fa-chevron-right",
                },
            })
            .on("dp.change", function handleFromDateChange(e) {
                jq("#reservation_to").data("DateTimePicker").minDate(e.date);
            });

        jq("#reservation_to").datetimepicker({
            format: "LT", // 시간과 분만 표시
            stepping: 30, // 30분 간격
            icons: {
                time: "fa fa-clock", // 시간 아이콘
                date: "fa fa-calendar", // 날짜 아이콘
                up: "fa fa-chevron-up",
                down: "fa fa-chevron-down",
                previous: "fa fa-chevron-left",
                next: "fa fa-chevron-right",
            },
        });

        // 예약하기 버튼 클릭 이벤트
        jq("#reserve_btn").on("click", async function (e) {
            e.preventDefault();
            const room = sanitizeInput(
                jq("#room_select .dropdown-item.active").data("value")
            );
            const team = sanitizeInput(
                jq("#team_select .dropdown-item.active").data("value")
            );
            const datePicker = jq("#reservation_date").data("DateTimePicker");
            const fromPicker = jq("#reservation_from").data("DateTimePicker");
            const toPicker = jq("#reservation_to").data("DateTimePicker");

            if (!room || !team || !datePicker || !fromPicker || !toPicker) {
                alert("모든 필드를 채워주세요.");
                return;
            }

            const date = sanitizeInput(datePicker.date().format("YYYY-MM-DD")); // 날짜 필터링
            const start = sanitizeInput(fromPicker.date().format("HH:mm")); // 시간 필터링
            const end = sanitizeInput(toPicker.date().format("HH:mm")); // 시간 필터링

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

        // 회의실 선택
        jq(document).on("click", "#room_select .dropdown-item", function (e) {
            e.preventDefault();
            const roomText = sanitizeInput(jq(this).text()); // 선택한 회의실 이름 필터링
            jq("#room_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#select_room_btn").text(roomText);
        });

        // 팀 선택
        jq(document).on("click", "#team_select .dropdown-item", function (e) {
            e.preventDefault();
            const teamText = sanitizeInput(jq(this).text()); // 선택한 팀 이름 필터링
            jq("#team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#team_select_btn").text(teamText);
        });
        jq("#login_team_select").on("click", ".dropdown-item", function (e) {
            e.preventDefault();
            const teamText = sanitizeInput(jq(this).text());
            console.log("teamText:", teamText);
            jq("#login_team_select .dropdown-item").removeClass("active");
            jq(this).addClass("active");
            jq("#login_team_select_btn").text(teamText);
        });

        // 로그인 버튼 클릭 이벤트
        jq("#login_btn").on("click", async function (e) {
            e.preventDefault();
            const userName = sanitizeInput(jq("#username").val()); // 사용자 입력 필터링
            const password = sanitizeInput(jq("#password").val()); // 사용자 입력 필터링
            const team = sanitizeInput(
                jq("#login_team_select .dropdown-item.active").data("value")
            );

            if (!userName || !password) {
                alert("모든 필드를 채워주세요.");
                return;
            }

            const loginData = {
                id: userName,
                password: password,
                team: team ? team : "",
            };

            try {
                const response = await login({ loginData: loginData });
                console.log("로그인 response:", response);
                if (response.isAdmin === "true") {
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
            const id = sanitizeInput(
                jq("#detail_reservation_content").data("id")
            ); // 예약 ID 필터링
            const reservationTeam = sanitizeInput(
                jq("#detail_reservation_content").data("team")
            ); // 팀 이름 필터링

            const urlParams = new URLSearchParams(window.location.search);
            const currentTeam = sanitizeInput(urlParams.get("team"));
            const isAdmin = getCookie("admin");

            if (reservationTeam !== currentTeam && !isAdmin) {
                alert("삭제 권한이 없습니다.");
                return;
            }

            try {
                await deleteReservationData({ id: id });
            } catch (error) {
                alert("데이터를 삭제하는데 오류가 발생했습니다.");
            }

            // 모달 닫기
            jq("#detail_reservation_modal").modal("hide");

            // 새로운 예약 데이터로 업데이트
            reserveModule.load(_searchDate);
        });

        /**
         * 수정하기 (버튼 클릭 이벤트)
         */
        // 수정하기 버튼 클릭 이벤트
        jq(document).on("click", "#edit_reservation_btn", function (e) {
            e.preventDefault();
            jq(".detail_reservation_item").prop("readonly", false); // 읽기 전용 해제

            // 현재 선택된 회의실 값
            const currentRoom = sanitizeInput(jq(".room-name").val()); // 방 이름 필터링

            // 회의실 옵션 동적 생성 및 기본값 설정
            let roomOptions = `<select class="form-control detail_reservation_item room-name">`;
            _meetingRooms.forEach((room) => {
                const sanitizedRoomName = sanitizeInput(room.name); // 각 회의실 이름 필터링
                roomOptions += `<option value="${sanitizedRoomName}" ${
                    currentRoom === sanitizedRoomName ? "selected" : ""
                }>${sanitizedRoomName}</option>`;
            });
            roomOptions += `</select>`;
            jq(".room-name").replaceWith(roomOptions); // 기존 방 이름 필드를 드롭다운으로 교체

            // 기존의 시작 시간과 종료 시간을 moment로 파싱
            const startTimeVal = moment(jq(".start-time").val(), "HH:mm");
            const endTimeVal = moment(jq(".end-time").val(), "HH:mm");

            jq(".start-time").replaceWith(
                `<input class="form-control detail_reservation_item start-time datetimepicker" type="text">`
            );
            jq(".end-time").replaceWith(
                `<input class="form-control detail_reservation_item end-time datetimepicker" type="text">`
            );

            jq(".start-time")
                .datetimepicker({
                    format: "LT", // 시간과 분만 표시
                    stepping: 30, // 30분 간격
                    icons: {
                        time: "fa fa-clock", // 시간 아이콘
                        date: "fa fa-calendar", // 날짜 아이콘
                        up: "fa fa-chevron-up",
                        down: "fa fa-chevron-down",
                        previous: "fa fa-chevron-left",
                        next: "fa fa-chevron-right",
                    },
                    defaultDate: startTimeVal,
                })
                .on("dp.change", function handleFromDateChange(e) {
                    jq("#reservation_to")
                        .data("DateTimePicker")
                        .minDate(e.date);
                });

            jq(".end-time").datetimepicker({
                format: "LT", // 시간과 분만 표시
                stepping: 30, // 30분 간격
                icons: {
                    time: "fa fa-clock", // 시간 아이콘
                    date: "fa fa-calendar", // 날짜 아이콘
                    up: "fa fa-chevron-up",
                    down: "fa fa-chevron-down",
                    previous: "fa fa-chevron-left",
                    next: "fa fa-chevron-right",
                },
                defaultDate: endTimeVal,
            });

            // 팀 필드를 드롭다운으로 변경하고 기본값을 설정
            const currentTeam = sanitizeInput(jq(".team-name").val()); // 팀 이름 필터링
            let teamOptions = `<select class="form-control detail_reservation_item team-name">`;
            _teams.forEach((team) => {
                const sanitizedTeamName = sanitizeInput(team.name); // 각 팀 이름 필터링
                teamOptions += `<option value="${sanitizedTeamName}" ${
                    currentTeam === sanitizedTeamName ? "selected" : ""
                }>${sanitizedTeamName}</option>`;
            });
            teamOptions += `</select>`;
            jq(".team-name").replaceWith(teamOptions); // 기존 팀 필드를 드롭다운으로 교체

            // 포커스를 회의실 드롭다운으로 이동
            jq(".room-name").focus();
            jq(".detail_reservation_item").addClass("blinking"); // 시각적 효과 추가

            // 수정 버튼을 저장 버튼으로 변경
            jq(this).text("저장하기").attr("id", "save_reservation_btn"); // 버튼 텍스트 및 ID 변경
        });

        // 저장하기 버튼 클릭 이벤트
        jq(document).on("click", "#save_reservation_btn", async function (e) {
            e.preventDefault();

            // 사용자가 수정한 예약 데이터에 대해 필터링 적용
            const id = sanitizeInput(jq(".id").val()); // 예약 ID 필터링
            const roomName = sanitizeInput(jq(".room-name").val()); // 방 이름 필터링
            const startTime = sanitizeInput(jq(".start-time").val()); // 시작 시간 필터링
            const endTime = sanitizeInput(jq(".end-time").val()); // 종료 시간 필터링
            const teamName = sanitizeInput(jq(".team-name").val()); // 팀 이름 필터링
            const parsedStartTime = moment(startTime, "hh:mm A").format(
                "HH:mm:ss"
            );
            const parsedEndTime = moment(endTime, "hh:mm A").format("HH:mm:ss");

            if (
                moment(startTime, "hh:mm A").isSameOrAfter(
                    moment(endTime, "hh:mm A")
                )
            ) {
                alert("시작 시간은 종료 시간보다 이른 시간이어야 합니다.");
                return;
            }

            // 수정된 시간과 방으로 예약 가능 여부 확인
            const isAvailable = isTimeSlotAvailable(
                _searchDate,
                roomName,
                parsedStartTime,
                parsedEndTime,
                id
            );

            if (!isAvailable) {
                alert("이미 예약된 시간이 있습니다.");
                return; // 시간이 겹친다면 저장하지 않음
            }

            try {
                // 서버에 수정된 예약 데이터를 전송
                await updateReservationData({
                    id,
                    room_name: roomName,
                    start_time: parsedStartTime,
                    end_time: parsedEndTime,
                    team_name: teamName,
                    book_date: _searchDate,
                });

                // 요청이 성공하면 다시 모든 input 필드를 readonly 상태로 전환
                jq(".detail_reservation_item").prop("readonly", true);
                jq(".detail_reservation_item").removeClass("blinking");

                // 버튼 텍스트를 "수정하기"로 변경하고, id를 다시 edit_reservation_btn으로 변경
                jq(this).text("수정하기").attr("id", "edit_reservation_btn"); // 버튼 복구
                jq("#detail_reservation_modal").modal("hide");
                reserveModule.load(); // 예약 데이터를 다시 로드
            } catch (error) {
                alert("수정하는데 오류가 발생했습니다.");
            }
        });

        // 모달이 닫힐 때 수정 버튼으로 되돌리기
        jq("#detail_reservation_modal").on("hidden.bs.modal", function () {
            // 저장 버튼을 다시 수정 버튼으로 변경
            jq("#save_reservation_btn")
                .text("수정하기")
                .attr("id", "edit_reservation_btn");

            // 다시 읽기 전용으로 설정
            jq(".detail_reservation_item").prop("readonly", true);
            jq(".detail_reservation_item").removeClass("blinking");
        });

        // Add the event listener for the bi-caret-left icon
        jq(".bi-caret-left").on("mousedown", function () {
            jq(this)
                .removeClass("bi-caret-left")
                .addClass("bi-caret-left-fill");

            // Decrement the date by rone day
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

            // 방 이름 필터링
            const roomName = sanitizeInput(
                jq(e.target)
                    .closest(".reserve-items td")
                    .closest("tr")
                    .data("room")
            );

            isMouseDown = true;
            startCellIndex = jq(this).index();
            endCellIndex = startCellIndex;
            _selectedCells.push(jq(this));
            _selectRoom = roomName;

            jq(this).addClass("select"); // 시각적 강조

            return false; // 텍스트 드래그 방지
        });
        jq(document).on("mousemove", ".reserve-items td", function (e) {
            const container = jq(".reservation-container")[0];
            const mouseX = e.clientX;

            if (isMouseDown) {
                const cellIndex = jq(this).index();

                // 오른쪽으로 드래그하는 경우
                if (cellIndex > endCellIndex) {
                    if (
                        !jq(this).hasClass("reserved") &&
                        _selectRoom ===
                            sanitizeInput(jq(this).closest("tr").data("room"))
                    ) {
                        _selectedCells.push(jq(this));
                        jq(this).addClass("select");
                    }
                }

                endCellIndex = cellIndex;

                // 스크롤 로직 추가: 마우스가 화면 가장자리에 도달하면 스크롤 시작
                if (mouseX >= window.innerWidth - 50) {
                    if (!scrollInterval) {
                        scrollInterval = setInterval(() => {
                            container.scrollLeft += 10;
                        }, 30);
                    }
                } else if (mouseX <= 50) {
                    if (!scrollInterval) {
                        scrollInterval = setInterval(() => {
                            container.scrollLeft -= 10;
                        }, 30);
                    }
                } else {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }
            }
        });
        jq(document).on("mouseup mouseleave", function () {
            // 마우스 버튼을 놓거나 화면을 벗어났을 때 스크롤 중지
            clearInterval(scrollInterval);
            scrollInterval = null;
        });

        jq(document).on("mouseover", ".reserve-items td", function (e) {
            // 필터링된 방 이름으로 작업
            const roomName = sanitizeInput(
                jq(e.target)
                    .closest(".reserve-items td")
                    .closest("tr")
                    .data("room")
            );
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
            const roomName = sanitizeInput(
                tdElement.closest("tr").data("room")
            ); // 방 이름 필터링

            if (isMouseDown) {
                isMouseDown = false;

                if (_selectedCells.length > 0) {
                    const startTime = calculateTime(
                        _selectedCells[0].index() + 1
                    );
                    const endTime = calculateTime(
                        _selectedCells[_selectedCells.length - 1].index() + 2
                    );
                    showReservationModal(startTime, endTime, roomName); // 필터링된 방 이름 전달
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
                    return sanitizeInput(jq(this).data("value")) === roomName; // 방 이름 필터링
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
            jq("#delete_room_select").empty();

            // 회의실 목록을 드롭다운에 추가
            _meetingRooms.forEach((room) => {
                const sanitizedRoomName = sanitizeInput(room.name); // 방 이름 필터링
                const sanitizedRoomKey = sanitizeInput(room.id); // 방 키 필터링
                const listItem = jq("<li></li>").append(
                    jq("<a></a>")
                        .addClass("dropdown-item")
                        .attr("href", "#")
                        .text(sanitizedRoomName)
                        .data("value", sanitizedRoomName)
                        .data("key", sanitizedRoomKey)
                );
                jq("#delete_room_select").append(listItem);
            });
        });
        // 회의실 드롭다운 메뉴 선택 시, 텍스트변경
        jq("#delete_room_select").on("click", ".dropdown-item", function () {
            const selectedText = sanitizeInput(jq(this).text()); // 선택된 텍스트 필터링
            const selectedKey = sanitizeInput(jq(this).data("key")); // 선택된 키 필터링

            jq("#delete_select_room_btn").text(selectedText);
            jq("#delete_select_room_btn").data("key", selectedKey);
        });
        // 회의실 삭제 버튼
        jq("#remove_meetingroom").on("click", async function () {
            const removeKey = sanitizeInput(
                jq("#delete_select_room_btn").data("key")
            ); // 회의실 키 필터링

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
        // 모달이 닫힐 때 선택된 버튼 초기화
        jq("#remove_meetingroom_modal").on("hidden.bs.modal", function () {
            // 회의실 삭제 선택 버튼 및 데이터 초기화
            jq("#delete_select_room_btn").text("회의실 선택").data("key", "");
        });
        // 회의실 추가 버튼
        jq("#create_meetingroom").on("click", async function () {
            const roomName = sanitizeInput(jq("#meetingroom_name").val()); // 회의실 이름 필터링

            try {
                await createRoom({ roomName: roomName });
                alert("회의실 생성이 완료되었습니다.");
                jq("#create_meetingroom_modal").modal("hide");
                jq("#meetingroom_name").val("");
                reserveModule.load();
            } catch (error) {
                alert(error);
                console.log("error:", error);
            }
        });
        // 모달이 닫힐 때 입력 필드 초기화
        jq("#create_meetingroom_modal").on("hidden.bs.modal", function () {
            jq("#meetingroom_name").val(""); // 입력 필드 초기화
        });
        // 팀생성
        jq("#create_team").on("click", async function () {
            const teamName = sanitizeInput(jq("#team_name").val()); // 팀 이름 필터링
            const teamColor = sanitizeInput(jq("#team_color").val()); // 팀 색상 필터링

            if (!teamName) {
                alert("팀 이름을 입력해 주세요.");
                return;
            }
            if (!isValidName(teamName)) {
                alert("유효하지 않은 팀 이름입니다.");
                return;
            }
            try {
                const teamData = {
                    name: teamName,
                    color: teamColor,
                };
                await createTeam({ teamData: teamData });

                alert("팀이 추가되었습니다.");
                reserveModule.load();
                jq("#team_name").val("");
                jq("#create_team_modal").modal("hide");
            } catch (error) {
                console.error("팀을 추가하는데 오류가 발생했습니다:", error);
                alert(error.responseJSON.detail);
            }
        });
        // 모달이 닫힐 때 입력 필드 초기화
        jq("#create_team_modal").on("hidden.bs.modal", function () {
            // 팀 이름 및 색상 입력 필드 초기화
            jq("#team_name").val("");
            jq("#team_color").val("");
        });

        jq("#remove_team_select").on("click", ".dropdown-item", function () {
            const selectedText = sanitizeInput(jq(this).text()); // 선택된 텍스트 필터링
            const selectedKey = sanitizeInput(jq(this).data("key")); // 선택된 키 필터링

            jq("#delete_select_team_btn").text(selectedText);
            jq("#delete_select_team_btn").data("key", selectedKey);
        });

        jq("#remove_team").on("click", async function () {
            const removeKey = sanitizeInput(
                jq("#delete_select_team_btn").data("key")
            ); // 팀 키 필터링

            try {
                await removeTeam({ teamKey: removeKey });
                alert("팀 삭제 완료!");
                jq("#delete_select_team_btn").text("팀 선택");
                jq("#remove_team_modal").modal("hide");
                reserveModule.load();
            } catch (error) {
                alert("팀을 삭제하는데 오류가 발생했습니다.:", error);
            }
        });
        // 모달이 닫힐 때 delete_select_team_btn 텍스트 초기화
        jq("#remove_team_modal").on("hidden.bs.modal", function () {
            // 버튼 텍스트 초기화
            jq("#delete_select_team_btn").text("팀 선택");
        });
        jq("#filter_team_select").on("click", ".dropdown-item", function () {
            // 선택된 팀 이름과 팀 키 필터링
            const selectedText = sanitizeInput(jq(this).text()); // 선택된 팀 이름 필터링
            const selectedKey = sanitizeInput(jq(this).data("key")); // 선택된 팀 키 필터링

            // 드롭다운 버튼의 텍스트를 선택된 팀 이름으로 변경
            jq("#filter_select_team_btn").text(selectedText); // 안전하게 팀 이름 설정
            jq("#filter_select_team_btn").data("key", selectedKey); // 팀 키 저장

            // 선택된 팀의 key를 필터링 변수에 저장
            _filterTeam = selectedKey;

            // 필터링된 팀을 기준으로 예약 목록 재로드
            reserveModule.load();
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
                jq(".reservation-container").hide();
                jq("#none_container").show();
            } else {
                jq(".reservation-container").show();
                jq("#none_container").css("display", "none");
            }
            const roomRows = {};
            jq("#room_select").empty();
            _meetingRooms.forEach((room) => {
                const roomName = truncateText(room.name, 10, 20);
                roomRows[
                    roomName
                ] = `<tr data-room="${roomName}"><td style="pointer-events: none; cursor: not-allowed; min-width:140px"><span>${roomName}</span></td>`;
                for (let i = 5; i <= 39; i++) {
                    roomRows[roomName] += `<td></td>`;
                }
                roomRows[roomName] += `</tr>`;

                jq("#room_select")
                    .append(`<li><a class="dropdown-item" href="#" data-value="${roomName}">${roomName}</a></li>
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
        // URL 파라미터에서 username과 team 값 필터링
        const urlParams = new URLSearchParams(window.location.search);
        const userName = sanitizeInput(urlParams.get("username")); // 사용자 이름 필터링
        const team = sanitizeInput(urlParams.get("team")); // 팀 이름 필터링
        const isAdmin = getCookie("admin"); // 쿠키에서 관리자 여부 확인

        // 관리자 계정일 때만 관리자 기능을 표시합니다.
        if (isAdmin) {
            jq("#create_team_btn").show();
            jq("#remove_team_btn").show();
            jq("#create_meetingroom_btn").show();
            jq("#remove_meetingroom_btn").show();
            jq("#setting").show();

            jq(".login-container").addClass("d-none");
            jq("#welcome_message").text(`관리자계정`).css("font-size", "20px");
            jq("#welcome_container").removeClass("d-none");
            return;
        }

        // 사용자가 로그인한 경우, 환영 메시지 표시
        if (userName && team) {
            jq(".login-container").addClass("d-none");
            jq("#welcome_message").text(
                `${userName}님 안녕하세요! (Team: ${team})`
            );
            jq("#welcome_container").removeClass("d-none");
            jq("#setting").hide();
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
    const truncateText = (text, maxKoreanLength, maxEnglishLength) => {
        let koreanCount = 0;
        let englishCount = 0;
        let truncatedText = "";

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
            if (char.charCodeAt(0) >= 0xac00 && char.charCodeAt(0) <= 0xd7a3) {
                koreanCount += 1; // 한글은 1로 계산
            } else {
                englishCount += 1; // 영어는 1로 계산
            }

            if (
                koreanCount <= maxKoreanLength &&
                englishCount <= maxEnglishLength
            ) {
                truncatedText += char;
            } else {
                truncatedText += "...";
                break;
            }
        }

        return truncatedText;
    };
    // 이름 검증 함수
    const isValidName = (teamName) => {
        // 최소 2글자 이상, 최대 20글자 이하
        if (teamName.length < 2 || teamName.length > 25) {
            return false;
        }

        // 자음 또는 모음만으로 이루어진 이름 방지
        const consonantOnlyPattern = /^[ㄱ-ㅎ]+$/; // 자음만
        const vowelOnlyPattern = /^[ㅏ-ㅣ]+$/; // 모음만
        if (
            consonantOnlyPattern.test(teamName) ||
            vowelOnlyPattern.test(teamName)
        ) {
            return false;
        }

        // 한글(자음+모음), 영어, 공백만 허용
        const validPattern = /^[가-힣a-zA-Z\s]+$/;
        if (!validPattern.test(teamName)) {
            return false;
        }

        return true;
    };

    return _pubFn;
})(jq);

jq(document).ready(function () {
    reserveModule.load();
    reserveModule.initEventListeners();
    reserveModule.checkLoginStatus();
});
