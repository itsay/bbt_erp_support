BBTApp.controller('misaConfigCtrl', ["$scope", "$http", function ($scope, $http) {
    $scope.data = {
        accounts: [],
        warehouses: [],
        enums: [],
    };
    $scope.filter = { accounts: '', warehouses: '', enums: '', enumCategory: '' };
    $scope.form = {};
    $scope.modalMode = 'add'; // 'add' | 'edit'
    $scope.deleteTarget = { type: '', item: null };

    const CATEGORY_LABELS = {
        pay_status: 'Trạng thái thanh toán',
        status: 'Trạng thái đơn hàng',
        sale_order_type: 'Loại đơn hàng',
    };

    // ===== Fetch data =====
    $scope.loadAccounts = function () {
        $http.get('/v1/misa-config/accounts').then(function (res) {
            if (res.data.s === 200) $scope.data.accounts = res.data.data;
        });
    };
    $scope.loadWarehouses = function () {
        $http.get('/v1/misa-config/warehouses').then(function (res) {
            if (res.data.s === 200) $scope.data.warehouses = res.data.data;
        });
    };
    $scope.loadEnums = function () {
        $http.get('/v1/misa-config/enums').then(function (res) {
            if (res.data.s === 200) $scope.data.enums = res.data.data;
        });
    };

    // ===== Helpers =====
    $scope.getPlatformClass = function (platform) {
        var p = (platform || '').toLowerCase();
        if (p.indexOf('shopee') !== -1) return 'badge-shopee';
        if (p.indexOf('tiktok') !== -1) return 'badge-tiktok';
        if (p.indexOf('lazada') !== -1) return 'badge-lazada';
        if (p.indexOf('retail') !== -1) return 'badge-retail';
        return 'badge-default';
    };
    $scope.getCategoryLabel = function (cat) {
        return CATEGORY_LABELS[cat] || cat;
    };
    $scope.getCategories = function () {
        return ['pay_status', 'status', 'sale_order_type'];
    };
    $scope.getFilteredEnums = function () {
        var list = $scope.data.enums;
        if ($scope.filter.enumCategory) {
            list = list.filter(function (e) { return e.category === $scope.filter.enumCategory; });
        }
        if ($scope.filter.enums) {
            var q = $scope.filter.enums.toLowerCase();
            list = list.filter(function (e) {
                return (e.key || '').toLowerCase().indexOf(q) !== -1 ||
                       (e.label || '').toLowerCase().indexOf(q) !== -1;
            });
        }
        return list;
    };

    // ===== Modal show =====
    $scope.showModal = function (type, mode, item) {
        $scope.modalMode = mode;
        $scope.form = mode === 'edit' ? structuredClone(item) : {};
        $('#modal-' + type).modal('show');
    };
    $scope.showModalDelete = function (type, item) {
        $scope.deleteTarget = { type: type, item: item };
        $('#modal-misa-delete').modal('show');
    };

    // ===== API endpoints map =====
    var API = {
        account: { list: 'accounts', single: 'account', dataKey: 'accounts' },
        warehouse: { list: 'warehouses', single: 'warehouse', dataKey: 'warehouses' },
        enum: { list: 'enums', single: 'enum', dataKey: 'enums' },
    };

    // ===== Save (add/edit) =====
    $scope.save = function (type) {
        var cfg = API[type];
        if ($scope.modalMode === 'add') {
            $http.post('/v1/misa-config/' + cfg.single, $scope.form).then(function (res) {
                if (res.data.s === 200) {
                    $scope.data[cfg.dataKey].push(res.data.data);
                    $scope.form = {};
                    $('#modal-' + type).modal('hide');
                    toastr.success('Thêm thành công');
                }
            }, function (err) {
                toastr.error(err.data?.message || 'Có lỗi xảy ra');
            });
        } else {
            $http.put('/v1/misa-config/' + cfg.single + '/' + $scope.form._id, $scope.form).then(function (res) {
                if (res.data.s === 200) {
                    var idx = $scope.data[cfg.dataKey].findIndex(function (d) { return d._id === res.data.data._id; });
                    if (idx !== -1) $scope.data[cfg.dataKey][idx] = res.data.data;
                    $scope.form = {};
                    $('#modal-' + type).modal('hide');
                    toastr.success('Cập nhật thành công');
                }
            }, function (err) {
                toastr.error(err.data?.message || 'Có lỗi xảy ra');
            });
        }
    };

    // ===== Delete =====
    $scope.confirmDelete = function () {
        var type = $scope.deleteTarget.type;
        var item = $scope.deleteTarget.item;
        var cfg = API[type];
        $http.delete('/v1/misa-config/' + cfg.single + '/' + item._id).then(function (res) {
            if (res.data.s === 200) {
                $scope.data[cfg.dataKey] = $scope.data[cfg.dataKey].filter(function (d) { return d._id !== item._id; });
                $('#modal-misa-delete').modal('hide');
                toastr.success('Xóa thành công');
            }
        }, function (err) {
            toastr.error(err.data?.message || 'Có lỗi xảy ra');
        });
    };

    // ===== Init =====
    $scope.loadAccounts();
    $scope.loadWarehouses();
    $scope.loadEnums();
}]);
