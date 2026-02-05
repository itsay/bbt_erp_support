BBTApp.controller('userManagerCtrl', ["$scope", "$http", function ($scope, $http) {
    $scope.data = {
        campaigns: [],
        users: [],
        campaignIdProcessing: '',
    }
    $scope.dataProcessing = {}
    $scope.getUsersByCampaign = () => {
        $http.get("/v1/users").then((res) => {
            if (res.data.s === 200) {
                $scope.data.users = res.data.data;
            }
        })
    }
    $scope.showModalAdd = () => {
        $scope.dataProcessing = {}
        $scope.dataProcessing.campaignId = $scope.data.campaignIdProcessing
        $('#modal-add').modal('show')
    }
    $scope.add = () => {
        $http.post("/v1/user", $scope.dataProcessing).then((res) => {
            if (res.data.s === 200) {
                $scope.getUsersByCampaign()
                $scope.dataProcessing = {}
                $('#modal-add').modal('hide')
            }
        })
    }
    $scope.showModalEdit = (user) => {
        $scope.dataProcessing = user
        $scope.dataProcessing.campaignId = $scope.data.campaignIdProcessing
        $('#modal-edit').modal('show')
    }
    $scope.edit = () => {
        $http.put(`/v1/user/${$scope.dataProcessing._id}`, $scope.dataProcessing).then((res) => {
            if (res.data.s === 200) {
                $scope.getUsersByCampaign()
                $scope.dataProcessing = {}
                $('#modal-edit').modal('hide')
            }
        })
    }
    $scope.showModalRemove = (id) => {
        $scope.dataProcessing.id = id
        $('#modal-confirm-remove').modal('show')
    }
    $scope.remove = () => {
        $http.delete(`/v1/user/${$scope.dataProcessing.id}`).then((res) => {
            if (res.data.s === 200) {
                $scope.getUsersByCampaign()
                $scope.dataProcessing = {}
                $('#modal-confirm-remove').modal('hide')
            }
        })
    }
    $scope.init = async () => {
        $scope.getUsersByCampaign();
    }
    $scope.init()
}])