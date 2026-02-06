BBTApp.controller('userManagerCtrl', ["$scope", "$http", function ($scope, $http) {
    $scope.data = {
        users: [],
    }
    $scope.dataProcessing = {}
    $scope.getUsers = () => {
        $http.get("/v1/users").then((res) => {
            if (res.data.s === 200) {
                $scope.data.users = res.data.data;
            }
        })
    }
    $scope.showModalAdd = () => {
        $scope.dataProcessing = {}
        $('#modal-add').modal('show')
    }
    $scope.add = () => {
        $http.post("/v1/user", $scope.dataProcessing).then((res) => {
            if (res.data.s === 200) {
                // $scope.getUsers()
                $scope.data.users.push(res.data.data);
                $scope.dataProcessing = {}
                $('#modal-add').modal('hide')
            }
        })
    }
    $scope.showModalEdit = (user) => {
        $scope.dataProcessing = structuredClone(user);
        $('#modal-edit').modal('show')
    }
    $scope.edit = () => {
        $http.put(`/v1/user/${$scope.dataProcessing._id}`, $scope.dataProcessing).then((res) => {
            if (res.data.s === 200) {
                // $scope.getUsers()
                const idx = $scope.data.users.findIndex(
                    u => u._id === res.data.data._id
                );
                if (idx !== -1) {
                    $scope.data.users[idx] = res.data.data;
                }
                $scope.dataProcessing = {}
                $('#modal-edit').modal('hide')
            }
        })
    }
    $scope.showModalRemove = (id) => {
        $scope.dataProcessing._id = id
        $('#modal-confirm-remove').modal('show')
    }
    $scope.remove = () => {
        $http.delete(`/v1/user/${$scope.dataProcessing._id}`).then((res) => {
            if (res.data.s === 200) {
                $scope.data.users = $scope.data.users.filter((user) => user._id !== $scope.dataProcessing._id)
                $scope.dataProcessing = {}
                $('#modal-confirm-remove').modal('hide')
            }
        })
    }
    $scope.init = async () => {
        $scope.getUsers();
    }
    $scope.init()
}])