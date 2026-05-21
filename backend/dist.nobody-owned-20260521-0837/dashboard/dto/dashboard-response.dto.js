"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalDashboardResponseDto = exports.DashboardChartDto = exports.QuickActionDto = exports.DashboardAlertDto = exports.DashboardStatsDto = void 0;
class DashboardStatsDto {
}
exports.DashboardStatsDto = DashboardStatsDto;
class DashboardAlertDto {
    message;
    type;
    priority;
    actionUrl;
    actionLabel;
}
exports.DashboardAlertDto = DashboardAlertDto;
class QuickActionDto {
    label;
    icon;
    url;
    permission;
    disabled;
    disabledReason;
}
exports.QuickActionDto = QuickActionDto;
class DashboardChartDto {
    type;
    title;
    labels;
    datasets;
}
exports.DashboardChartDto = DashboardChartDto;
class UniversalDashboardResponseDto {
    stats;
    alerts;
    quickActions;
    charts;
    metadata;
}
exports.UniversalDashboardResponseDto = UniversalDashboardResponseDto;
//# sourceMappingURL=dashboard-response.dto.js.map