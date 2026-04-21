import { Controller, Get, Query, Param } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import {
  SchoolSettingsService,
  SCHOOL_SETTING_KEYS,
} from '../school-settings/school-settings.service';

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly schoolSettingsService: SchoolSettingsService,
  ) {}

  /**
   * Get current Ethiopian year
   * Returns the current Ethiopian year based on today's Gregorian date
   */
  @Get('ethiopian-year')
  getCurrentEthiopianYear() {
    const year = this.calendarService.getCurrentEthiopianYear();
    return {
      year,
      description: 'Current Ethiopian year',
    };
  }

  /**
   * Get current date information in both calendars
   */
  @Get('current')
  getCurrentDate() {
    return this.calendarService.getCurrentDateInfo();
  }

  /**
   * Convert a specific Gregorian date to Ethiopian date
   */
  @Get('convert')
  convertDate(@Query('date') date: string) {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' };
      }
      return this.calendarService.getCalendarConversion(parsedDate);
    } catch (error) {
      return { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' };
    }
  }

  /**
   * Convert Ethiopian date to Gregorian
   */
  @Get('convert-to-gregorian')
  convertToGregorian(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('day') day: string,
  ) {
    try {
      const ethYear = parseInt(year, 10);
      const ethMonth = parseInt(month, 10);
      const ethDay = parseInt(day, 10);

      if (isNaN(ethYear) || isNaN(ethMonth) || isNaN(ethDay)) {
        return {
          error: 'Invalid parameters. Provide year, month, and day as numbers',
        };
      }

      const gregorianDate = this.calendarService.convertEthiopianToGregorian(
        ethYear,
        ethMonth,
        ethDay,
      );

      return {
        ethiopian: { year: ethYear, month: ethMonth, day: ethDay },
        gregorian: gregorianDate.toISOString().split('T')[0],
      };
    } catch (error) {
      return { error: 'Invalid Ethiopian date' };
    }
  }

  /**
   * Get calendar mode for a specific school
   */
  @Get('school/:schoolId/mode')
  async getSchoolCalendarMode(@Param('schoolId') schoolId: string) {
    const calendarType = await this.schoolSettingsService.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.CALENDAR_TYPE,
    );

    return {
      schoolId,
      calendarType: calendarType || 'ETHIOPIAN',
    };
  }

  /**
   * Check if Ethiopian new year period (around September 11)
   */
  @Get('new-year-check')
  checkNewYear(@Query('date') date?: string) {
    const checkDate = date ? new Date(date) : new Date();
    const isNewYearPeriod =
      this.calendarService.isEthiopianNewYearPeriod(checkDate);
    const ethiopianYear = this.calendarService.getEthiopianYear(checkDate);

    return {
      date: checkDate.toISOString().split('T')[0],
      isNewYearPeriod,
      ethiopianYear,
      message: isNewYearPeriod
        ? 'Ethiopian New Year (Enkutatash) period'
        : 'Not in Ethiopian New Year period',
    };
  }
}
